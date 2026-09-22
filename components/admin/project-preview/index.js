import cn from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import s from './project-preview.module.scss'

/**
 * Live preview of the case page while a project is edited: the real
 * /project.html in an iframe (preview mode), fed the draft with postMessage,
 * so what the editor shows is exactly what visitors will get.
 */
const SIZES = [
  { key: 'desktop', label: 'Desktop', width: null },
  { key: 'tablet', label: 'Tablet', width: 834 },
  { key: 'phone', label: 'Phone', width: 390 },
]

const toList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export function ProjectPreview({ form, mediaItems }) {
  const frameRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [size, setSize] = useState('desktop')

  // The draft in the shape assets/case.js renders.
  const project = useMemo(() => {
    const media = (mediaItems || [])
      .filter((item) => item.url)
      .map((item) => ({
        kind: item.kind === 'video' ? 'video' : 'image',
        url: item.url,
        title: item.title || form.name,
        span: item.columnSpan === 'one_column' ? 1 : 2,
      }))
    return {
      title: form.name,
      tag: toList(form.services).join(', '),
      industry: form.industry,
      body: form.body,
      testimonial: form.testimonial,
      stack: toList(form.stack),
      link: form.link,
      img: media.find((m) => m.kind === 'image')?.url || null,
      video: media.find((m) => m.kind === 'video')?.url || null,
      media,
    }
  }, [form, mediaItems])

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'arteria-preview-ready') setReady(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // Send the draft, a beat after typing stops.
  useEffect(() => {
    if (!ready) return undefined
    const id = setTimeout(() => {
      frameRef.current?.contentWindow?.postMessage(
        { type: 'arteria-preview', project },
        window.location.origin,
      )
    }, 250)
    return () => clearTimeout(id)
  }, [project, ready])

  const width = SIZES.find((item) => item.key === size)?.width

  return (
    <section className={s.root} aria-label="Page preview">
      <header className={s.bar}>
        <span className={s.label}>Preview</span>
        <div className={s.sizes}>
          {SIZES.map((item) => (
            <button
              key={item.key}
              type="button"
              className={cn(s.size, size === item.key && s.sizeOn)}
              onClick={() => setSize(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={s.size}
          onClick={() => {
            setReady(false)
            if (frameRef.current) frameRef.current.src = frameRef.current.src
          }}
        >
          Reload
        </button>
      </header>
      <div className={s.stage}>
        <iframe
          ref={frameRef}
          className={s.frame}
          style={width ? { width: `${width}px` } : undefined}
          src="/project.html?preview=1"
          title="Case page preview"
        />
      </div>
    </section>
  )
}
