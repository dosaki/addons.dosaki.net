import sharp from 'sharp'
import { OG_HEIGHT, OG_WIDTH, TOUCH_SIZE } from './meta.js'
import { BG } from './theme.js'

/**
 * Link previews cannot use the addon's icon.svg directly: Facebook, X,
 * Discord, Slack and LinkedIn all reject SVG for og:image and render no
 * preview at all. This rasterises it.
 *
 * IMPORTANT: this module imports sharp, a native binary that cannot be
 * esbuild-bundled. It must stay out of the Lambda's import graph - only
 * scripts/bake.ts and og.test.ts may import it. See lambda-graph.test.ts.
 */

/**
 * The source logos are nominally 500x500. At libvips' default 72dpi the
 * vectors would be rendered small and then upscaled into the 1200px card;
 * 300 renders them at the size actually needed.
 */
const DENSITY = 300

/** Logo width inside the card - leaves a comfortable margin at 630 tall. */
const CARD_LOGO_SIZE = 440

async function onBackground(
  svg: Uint8Array,
  logoSize: number,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const logo = await sharp(Buffer.from(svg), { density: DENSITY })
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  return new Uint8Array(
    await sharp({ create: { width, height, channels: 4, background: BG } })
      .composite([{ input: logo, gravity: 'centre' }])
      .png({ compressionLevel: 9 })
      .toBuffer(),
  )
}

/** The 1200x630 link-preview card. */
export function ogCard(svg: Uint8Array): Promise<Uint8Array> {
  return onBackground(svg, CARD_LOGO_SIZE, OG_WIDTH, OG_HEIGHT)
}

/** The iOS home-screen icon, full-bleed on the theme background. */
export function touchIcon(svg: Uint8Array): Promise<Uint8Array> {
  return onBackground(svg, TOUCH_SIZE, TOUCH_SIZE, TOUCH_SIZE)
}
