import sharp from 'sharp'

/**
 * An ALB-invoked Lambda may return at most 1 MB, and binary bodies are
 * base64-encoded into the envelope (~+33%). 700 KB leaves headroom for that
 * expansion plus headers.
 */
export const MAX_ASSET_BYTES = 700 * 1024
export const MAX_WIDTH = 1600
export const WEBP_QUALITY = 82

export async function optimiseImage(key: string, input: Buffer): Promise<Uint8Array> {
  let output: Uint8Array
  if (key.toLowerCase().endsWith('.svg')) {
    output = new Uint8Array(input)
  } else {
    try {
      output = new Uint8Array(
        await sharp(input)
          .resize({ width: MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer(),
      )
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      throw new Error(`${key}: ${reason}`)
    }
  }

  if (output.byteLength > MAX_ASSET_BYTES) {
    const kb = Math.round(output.byteLength / 1024)
    throw new Error(
      `${key} is ${kb} KB, over the 700 KB limit an ALB-invoked Lambda can return. ` +
        `Shrink the source image or crop it.`,
    )
  }

  return output
}
