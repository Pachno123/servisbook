// Image helpers used by signature canvas + photo uploads.

/**
 * Rotate the signature canvas 90° clockwise and return as data URL.
 *
 * Why: customer signs on a phone held landscape, but the canvas is
 * rendered landscape-on-portrait in CSS — the bitmap is therefore
 * sideways relative to how the PDF prints it. Rotating CW on export
 * lines it back up with the printed page.
 */
export function rotateCanvas90CW(canvas: HTMLCanvasElement): string {
  const w = canvas.width
  const h = canvas.height
  const out = document.createElement('canvas')
  out.width = h
  out.height = w
  const ctx = out.getContext('2d')!
  ctx.translate(h, 0)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(canvas, 0, 0)
  return out.toDataURL('image/png')
}

/**
 * Read a photo File, apply EXIF orientation, return a normalized File
 * with the rotation baked into the pixels (so older PDF libs don't have
 * to handle EXIF themselves).
 *
 * Uses createImageBitmap with imageOrientation: 'from-image' — the
 * browser handles the rotation natively. Falls back to original file
 * if the API isn't available or the bitmap fails.
 */
export async function normalizePhotoFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = { imageOrientation: 'from-image' }
    const bitmap = await createImageBitmap(file, opts)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close?.()
    const blob: Blob | null = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    )
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch (_e) {
    return file
  }
}
