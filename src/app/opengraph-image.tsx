import { ImageResponse } from 'next/og'

/**
 * The card that appears when someone shares the site in WhatsApp, Messenger or a group chat —
 * which, for a village restaurant, is a meaningful share of how people find it.
 *
 * Generated rather than a static file so it cannot drift from the brand, and deliberately typographic:
 * there is no usable photography of the restaurant, and a stock curry photograph would be a lie.
 */
export const runtime = 'nodejs'
export const alt = 'Javatri — Indian restaurant and banqueting, Littlewick Green, Maidenhead'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px 80px',
          // Lime Cream with one Pistachio lift, the same construction as the hero it stands for.
          background:
            'radial-gradient(1100px 620px at 88% 8%, #9bb979 0%, transparent 62%), #dce6c8',
          color: '#182112',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#3f582d',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          The Bell and Bottle · Littlewick Green
        </div>

        {/*
          Satori (which renders this) requires an explicit display on any element with more than
          one child, and has no line-break handling — so each line is its own flex row rather than
          one block with a <br>.
        */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28 }}>
          <div style={{ display: 'flex', fontSize: 92, lineHeight: 1.06, letterSpacing: -2 }}>
            Indian cooking,
          </div>
          <div style={{ display: 'flex', fontSize: 92, lineHeight: 1.06, letterSpacing: -2 }}>
            on the Bath Road.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 34,
            width: 380,
            height: 3,
            background: 'linear-gradient(90deg, #6c8a56, transparent)',
          }}
        />

        <div
          style={{
            display: 'flex',
            fontSize: 28,
            marginTop: 32,
            color: '#475d37',
            fontFamily: 'Helvetica, Arial, sans-serif',
          }}
        >
          Collection · Delivery · Tables · Events for 150
        </div>
      </div>
    ),
    size,
  )
}
