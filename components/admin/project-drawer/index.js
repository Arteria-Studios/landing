import cn from 'clsx'
import { useEffect } from 'react'
import s from './project-drawer.module.scss'

export function ProjectDrawer({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.documentElement.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className={cn(s.container, open && s.open)} aria-hidden={!open}>
      <button
        type="button"
        className={s.overlay}
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className={cn(s.panel, open && s.open)} role="dialog" aria-modal="true">
        <header className={s.header}>
          <h2 className={s.title}>{title}</h2>
          <button type="button" className={s.close} onClick={onClose}>
            close
          </button>
        </header>
        <div className={s.body}>{children}</div>
      </aside>
    </div>
  )
}
