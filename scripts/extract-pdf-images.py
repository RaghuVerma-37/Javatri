"""
Pulls the dish photograph off each PDF page and writes it as a trimmed, square webp.

Run once, with pymupdf installed:
    python3 scripts/extract-pdf-images.py

Three things it has to get right:

  * The furniture. Every page carries a 384x672 decorative panel as well as the food. Taking the
    largest image per page picks the food; taking the first would pick whichever the PDF happened
    to store first.
  * The padding. The food occupies only 28-40% of its canvas, the rest transparent. Dropped into a
    112px card unchanged, the dish would render as a stamp in the middle of an empty square. Each
    one is trimmed to its actual content before anything else happens.
  * The shape. The cards are square and use object-cover, which crops. Fitting the trimmed food
    inside a square canvas rather than filling it means nothing is ever cut off the plate.

Transparency is preserved, so the card background shows through instead of a white box.
"""
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


def slugify(value: str) -> str:
    """Mirrors slugify() in prisma/source-data.ts, so filenames match dish slugs."""
    value = value.lower().replace("&", " and ")
    value = re.sub(r"[‘’ʼ']", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def dish_image(doc, page):
    """The largest image on the page that is not the repeated decorative panel."""
    best = None
    for entry in page.get_images(full=True):
        info = doc.extract_image(entry[0])
        if (info["width"], info["height"]) == FURNITURE:
            continue
        area = info["width"] * info["height"]
        if best is None or area > best[0]:
            best = (area, info)
    return None if best is None else best[1]


def main() -> int:
    dishes = json.loads((ROOT / "scripts" / "pdf-dishes.json").read_text())
    mapping = json.loads((ROOT / "scripts" / "pdf-menu-map.json").read_text())
    by_page = {d["page"]: d for d in dishes}

    # Which page's photograph to use, and what to call the file.
    targets = {}
    for page_str, site_name in mapping["match"].items():
        targets[int(page_str)] = slugify(site_name)
    for page_str in mapping["new"]:
        targets[int(page_str)] = slugify(by_page[int(page_str)]["name"])
    # A duplicate page supplies the photograph only when the map says its image won.
    for page_str, info in mapping["duplicates"].items():
        page = int(page_str)
        if info["use"] == "image":
            targets[page] = targets.pop(info["sameAs"], targets.get(page))

    OUT.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(PDF)
    written = 0
    for page_no, slug in sorted(targets.items()):
        info = dish_image(doc, doc[page_no - 1])
        if info is None:
            print(f"  page {page_no}: no dish image", file=sys.stderr)
            continue

        tmp = OUT / f".raw-{page_no}.{info['ext']}"
        tmp.write_bytes(info["image"])
        img = Image.open(tmp).convert("RGBA")

        box = img.getbbox()  # bounding box of the non-transparent pixels
        if box:
            img = img.crop(box)

        inner = CANVAS - 2 * MARGIN
        scale = min(inner / img.width, inner / img.height)
        img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)

        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        canvas.paste(img, ((CANVAS - img.width) // 2, (CANVAS - img.height) // 2), img)
        canvas.save(OUT / f"{slug}.webp", "WEBP", quality=82, method=6)
        tmp.unlink()
        written += 1

    print(f"{written} dish photographs written to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
