import { useEffect, useRef } from 'react'
import type { Bitmap } from '../lib/bitmap/bitmap'
import { drawBitmap } from '../platform/browser'

/** ビットマップを縮小/拡大せずに描き、CSS で表示サイズに合わせる（ピクセルが滲まない） */
export function BitmapCanvas(props: {
  bitmap: Bitmap
  className?: string
  /** 表示の最大サイズ(px)。小さい画像は整数倍に拡大する */
  maxSize?: number
}) {
  const { bitmap, className, maxSize = 56 } = props
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (ref.current) drawBitmap(ref.current, bitmap)
  }, [bitmap])

  const scale = Math.max(
    1,
    Math.floor(maxSize / Math.max(bitmap.width, bitmap.height)),
  )
  const fit = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const factor = scale > 1 ? scale : fit

  return (
    <canvas
      ref={ref}
      className={`pixel ${className ?? ''}`}
      style={{ width: bitmap.width * factor, height: bitmap.height * factor }}
    />
  )
}
