import cn from 'clsx'
import { parseApiResponse } from 'lib/parse-api-response'
import { useCallback, useEffect, useState } from 'react'
import s from './project-sort-list.module.scss'

export function ProjectSortList({
  projects,
  onProjectsChange,
  onEdit,
  onDelete,
  onStatus,
}) {
  const [items, setItems] = useState(projects)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setItems(projects)
  }, [projects])

  const moveItem = useCallback((list, from, to) => {
    if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
      return list
    }
    const next = [...list]
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    return next
  }, [])

  const persistOrder = async (ordered) => {
    setSaving(true)
    onStatus?.('Saving order…')

    try {
      const response = await fetch('/api/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: ordered.map((p) => p.id) }),
      })
      const { data: payload, error } = await parseApiResponse(response)

      if (!response.ok) {
        throw new Error(error || 'Failed to save order')
      }

      setItems(payload.items)
      onProjectsChange(payload.items)
      onStatus?.('Homepage order saved.')
    } catch (err) {
      setItems(projects)
      onStatus?.(err.message)
    } finally {
      setSaving(false)
      setDragIndex(null)
      setOverIndex(null)
    }
  }

  const finishDrag = (toIndex) => {
    if (dragIndex === null || dragIndex === toIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const next = moveItem(items, dragIndex, toIndex)
    setItems(next)
    persistOrder(next)
  }

  if (items.length === 0) {
    return (
      <p className={s.empty}>No projects yet. Click Add project.</p>
    )
  }

  return (
    <div className={s.root}>
      <p className={s.hint}>
        Drag the handle to set homepage order (top = first on the main page).
        {saving && <span className={s.saving}> Saving…</span>}
      </p>
      <ul className={s.list} role="list">
        {items.map((project, index) => (
          <li
            key={project.id}
            className={cn(
              s.row,
              dragIndex === index && s.rowDragging,
              overIndex === index && dragIndex !== index && s.rowOver,
            )}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              if (dragIndex !== null && overIndex !== index) {
                setOverIndex(index)
              }
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setOverIndex(null)
              }
            }}
            onDrop={(event) => {
              event.preventDefault()
              finishDrag(index)
            }}
          >
            <button
              type="button"
              className={s.handle}
              aria-label={`Reorder ${project.name}`}
              draggable={!saving}
              disabled={saving}
              onDragStart={(event) => {
                setDragIndex(index)
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', String(index))
              }}
              onDragEnd={() => {
                setDragIndex(null)
                setOverIndex(null)
              }}
            >
              <span className={s.burger} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
            <div className={s.meta}>
              <span className={s.order}>{index + 1}</span>
              <div className={s.info}>
                <span className={s.name}>{project.name}</span>
                <span className={s.sub}>
                  {project.industry || '—'} · {project.media?.length || 0} media
                </span>
              </div>
            </div>
            <div className={s.actions}>
              <button
                type="button"
                className={s.btn}
                onClick={() => onEdit(project)}
              >
                Edit
              </button>
              <button
                type="button"
                className={cn(s.btn, s.btnDanger)}
                onClick={() => onDelete(project.id)}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
