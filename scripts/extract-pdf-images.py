"""
Pulls the dish photograph off each PDF page and writes it as a trimmed, square webp.

Run once, with pymupdf installed:
    python3 scripts/extract-pdf-images.py

Three things it has to get right:

  * The transparency. A PDF keeps a cut-out's alpha in a separate soft-mask object, and
    doc.extract_image() hands back only the base image — which arrives with a solid black field
    where the background should be. The mask has to be fetched by its own xref and applied, or
    every dish ends up in a black box.
  * The furniture. Every page carries a 384x672 decorative panel as well as the food. Taking the
    largest image per page picks the food; taking the first would pick whichever the PDF happened
    to store first.
  * The padding. The food occupies only 28-40% of its canvas, the rest transparent. Dropped into a
    112px card unchanged, the dish would render as a stamp in the middle of an empty square. Each
    one is trimmed to its actual content before anything else happens.
  * The shape. The cards are square and use object-cover, which crops. Fitting the trimmed food
    inside a square canvas rather than filling it means nothing is ever cut off the plate.

The result is composited onto white, the way the photographs were lit and the way the client
asked for them — a product shot rather than a cut-out floating on whatever colour is behind it —
and carries the Javatri wordmark bottom-right.

The watermark is applied here, to the file, and only to these photographs. The library
stand-ins in public/dishes are other people's work, used under licences that require attributing
*them*; they are never touched by this script.
"""
import io
import json
import pathlib
import re
import sys

import pymupdf
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
PDF = ROOT / "Javatri Food Items (2).pdf"
OUT = ROOT / "public" / "dishes" / "pdf"
FURNITURE = (384, 672)
CANVAS = 800
MARGIN = 24
# The wordmark, bottom-right, sized as a share of the canvas. Baked into the file rather than
# overlaid in the page so it travels with the photograph wherever it is used.
LOGO_WIDTH = 190
LOGO_MARGIN = 26


def slugify(value: str) -> str:
    """Mirrors slugify() in prisma/source-data.ts, so filenames match dish slugs."""
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[‘’ʼ']", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def dish_image(doc, page):
    """
    The largest image on the page that is not the repeated decorative panel, with its soft mask
    applied so the cut-out is actually cut out.

    Returns a PIL RGBA image, or None.
    """
    best = None
    for entry in page.get_images(full=True):
        xref, smask_xref = entry[0], entry[1]
        info = doc.extract_image(xref)
        if (info["width"], info["height"]) == FURNITURE:
            continue
        area = info["width"] * info["height"]
        if best is None or area > best[0]:
            best = (area, xref, smask_xref)

    if best is None:
        return None

    _, xref, smask_xref = best
    pix = pymupdf.Pixmap(doc, xref)
    if smask_xref:
        # Pixmap(base, mask) returns the base with the mask as its alpha channel.
        pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, smask_xref))
    return Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")


def load_logo(doc):
    """The wordmark as an RGBA image, trimmed to its artwork."""
    for entry in doc[0].get_images(full=True):
        xref, smask_xref = entry[0], entry[1]
        info = doc.extract_image(xref)
        if (info["width"], info["height"]) != FURNITURE:
            continue
        pix = pymupdf.Pixmap(doc, xref)
        if smask_xref:
            pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, smask_xref))
        logo = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")
        box = logo.getbbox()
        return logo.crop(box) if box else logo
    return None


def extract_logo(doc) -> None:
    """
    The 384x672 panel repeated on every page is the Javatri wordmark. Saved out once, trimmed to
    its artwork, so the site has the real logo rather than a redrawn approximation.
    """
    for entry in doc[0].get_images(full=True):
        xref, smask_xref = entry[0], entry[1]
        info = doc.extract_image(xref)
        if (info["width"], info["height"]) != FURNITURE:
            continue
        pix = pymupdf.Pixmap(doc, xref)
        if smask_xref:
            pix = pymupdf.Pixmap(pix, pymupdf.Pixmap(doc, smask_xref))
        logo = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGBA")
        box = logo.getbbox()
        if box:
            logo = logo.crop(box)
        out = ROOT / "public" / "javatri-logo.webp"
        logo.save(out, "WEBP", quality=90, method=6, lossless=True)

        # A light version for dark backgrounds. The wordmark is #851917, which against the dark
        # theme's #14110f header is a contrast ratio of 1.85:1 — under the 3:1 a graphic needs,
        # and in practice close to invisible. Recolouring the ink while keeping the alpha
        # preserves the letterforms, which are the brand; the red is kept for light backgrounds.
        light = Image.new("RGBA", logo.size, (246, 239, 229, 0))
        light.putalpha(logo.getchannel("A"))
        light_out = ROOT / "public" / "javatri-logo-light.webp"
        light.save(light_out, "WEBP", quality=90, method=6, lossless=True)

        print(f"logo written to {out.relative_to(ROOT)} ({logo.width}x{logo.height})")
        print(f"light variant written to {light_out.relative_to(ROOT)}")
        return


def main() -> int:
    dishes = json.loads((ROOT / "scripts" / "pdf-dishes.json").read_text())
    mapping = json.loads((ROOT / "scripts" / "pdf-menu-map.json").read_text())
    by_page = {d["page"]: d for d in dishes}

    # Which page's photograph to use, and what to call the file.
    targets = {}
    for page_str, site_name in mapping["match"].items():
        targets[int(page_str)] = slugify(site_name)
    corrections = mapping.get("name_corrections", {})
    for page_str in mapping["new"]:
        page = int(page_str)
        # Same corrected name the importer uses, or the file and the dish would disagree.
        targets[page] = slugify(corrections.get(page_str, by_page[page]["name"]))
    # A duplicate page supplies the photograph only when the map says its image won.
    for page_str, info in mapping["duplicates"].items():
        page = int(page_str)
        if info["use"] == "image":
            targets[page] = targets.pop(info["sameAs"], targets.get(page))

    OUT.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(PDF)
    extract_logo(doc)
    logo = load_logo(doc)
    if logo is not None:
        ratio = LOGO_WIDTH / logo.width
        logo = logo.resize((LOGO_WIDTH, max(1, round(logo.height * ratio))), Image.LANCZOS)
    written = 0
    for page_no, slug in sorted(targets.items()):
        img = dish_image(doc, doc[page_no - 1])
        if img is None:
            print(f"  page {page_no}: no dish image", file=sys.stderr)
            continue

        box = img.getbbox()  # bounding box of the non-transparent pixels
        if box:
            img = img.crop(box)

        inner = CANVAS - 2 * MARGIN
        scale = min(inner / img.width, inner / img.height)
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)

        canvas = Image.new("RGB", (CANVAS, CANVAS), (255, 255, 255))
        canvas.paste(img, ((CANVAS - img.width) // 2, (CANVAS - img.height) // 2), img)
        if logo is not None:
            canvas.paste(
                logo,
                (CANVAS - logo.width - LOGO_MARGIN, CANVAS - logo.height - LOGO_MARGIN),
                logo,
            )
        canvas.save(OUT / f"{slug}.webp", "WEBP", quality=82, method=6)
        written += 1

    print(f"{written} dish photographs written to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
