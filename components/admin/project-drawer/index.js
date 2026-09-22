import cn from 'clsx'
import { useEffect } from 'react'
import s from './project-drawer.module.scss'

/**
 * Project editor: the form in a column on the left, the live page preview
 * filling the rest on the right (see components/admin/project-preview).
 */
export function ProjectDrawer({ open, title, onClose, children, preview }) {
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
      <div className={s.layout} role="dialog" aria-modal="true" aria-label={title}>
        <aside className={cn(s.panel, open && s.open)}>
          <header className={s.header}>
            <h2 className={s.title}>{title}</h2>
            <button type="button" className={s.close} onClick={onClose}>
              close
            </button>
          </header>
          <div className={s.body}>{children}</div>
        </aside>
        <div className={s.preview}>{preview}</div>
      </div>
    </div>
  )
}
