import { shouldUnoptimizeImage } from 'lib/s3-image-settings'
import NextImage from 'next/image'
import s from './media-preview-image.module.scss'

/** Admin card thumbnails (~140px column, 4:3). */
export const ADMIN_PREVIEW_SIZES = '140px'

export function MediaPreviewImage({ src, alt = 'Media preview' }) {
  return (
    <NextImage
      src={src}
      alt={alt}
      fill
      className={s.image}
      sizes={ADMIN_PREVIEW_SIZES}
      quality={75}
      unoptimized={shouldUnoptimizeImage(src)}
    />
  )
}
