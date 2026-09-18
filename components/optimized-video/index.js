import cn from 'clsx'
import { useEffect, useRef, useState } from 'react'
import s from './optimized-video.module.scss'

/**
 * Videos are not optimized by Next.js — we lazy-load until near the viewport,
 * then stream from storage with metadata-first preload.
 */
export function OptimizedVideo({
  src,
  className,
  poster,
  priority = false,
  paused = false,
}) {
  const wrapRef = useRef(null)
  const videoRef = useRef(null)
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el || priority) return undefined
    const observer = new IntersectionObserver(
      ([entry]) => setIsNear(entry.isIntersecting),
      { threshold: 0.12, rootMargin: '160px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [priority])

  const isNearViewport = priority || isNear
  const shouldPlay = isNearViewport && !paused

  useEffect(() => {
    const video = videoRef.current
    if (!video || !isNearViewport) return

    if (shouldPlay) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [shouldPlay, isNearViewport])

  return (
    <div ref={wrapRef} className={cn(s.wrap, className)}>
      <video
        ref={videoRef}
        className={s.video}
        src={isNearViewport ? src : undefined}
        poster={poster}
        muted
        loop
        playsInline
        preload={priority ? 'auto' : isNearViewport ? 'metadata' : 'none'}
      />
    </div>
  )
}
