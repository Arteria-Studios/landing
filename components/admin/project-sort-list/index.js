import cn from 'clsx'
import { parseApiResponse } from 'lib/parse-api-response'
import { useCallback, useEffect, useMemo, useState } from 'react'
import s from './project-sort-list.module.scss'

/**
 * Projects in the admin. Two views:
 * - A–Z, for finding a project quickly (the default);
 * - Site order, where rows are dragged to set what the home page and Works show.
 * A row opens the editor; the number badge is always the position on the site.
 */
export function ProjectSortList({
  projects,
  onProjectsChange,
  onEdit,
  onDelete,
  onStatus,
}) {
  const [items, setItems] = useState(projects)
  const [sort, setSort] = useState('az')
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setItems(projects)
  }, [projects])

  // What the list shows; site positions stay visible in both views.
  const rows = useMemo(() => {
    const withPosition = items.map((project, index) => ({ project, position: index + 1 }))
    if (sort === 'site') return withPosition
    return [...withPosition].sort((a, b) =>
      a.project.name.localeCompare(b.project.name, undefined, { sensitivity: 'base' }),
    )
  }, [items, sort])

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
    return <p className={s.empty}>No projects yet. Click Add project.</p>
  }

  const canDrag = sort === 'site'

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <p className={s.hint}>
          {canDrag
            ? 'Drag the handle to set the order on the site (top = first on the home page).'
            : 'Sorted A–Z. Switch to Site order to change what the home page shows.'}
          {saving && <span className={s.saving}> Saving…</span>}
        </p>
        <div className={s.views}>
          <button
            type="button"
            className={cn(s.view, sort === 'az' && s.viewOn)}
            onClick={() => setSort('az')}
          >
            A–Z
          </button>
          <button
            type="button"
            className={cn(s.view, canDrag && s.viewOn)}
            onClick={() => setSort('site')}
          >
            Site order
          </button>
        </div>
      </div>
      <ul className={s.list} role="list">
        {rows.map(({ project, position }) => {
          const index = position - 1
          return (
            <li
              key={project.id}
              className={cn(
                s.row,
                dragIndex === index && s.rowDragging,
                overIndex === index && dragIndex !== index && s.rowOver,
              )}
              onDragOver={(event) => {
                if (!canDrag) return
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
                if (!canDrag) return
                event.preventDefault()
                finishDrag(index)
              }}
            >
              {canDrag && (
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
              )}
              {/* The row itself opens the editor. */}
              <button
                type="button"
                className={s.open}
                onClick={() => onEdit(project)}
                title={`Edit ${project.name}`}
              >
                <span className={s.order}>{String(position).padStart(2, '0')}</span>
                <span className={s.info}>
                  <span className={s.name}>{project.name}</span>
                  <span className={s.sub}>
                    {project.industry || 'No industry'} ·{' '}
                    {project.media?.length || 0} media
                  </span>
                </span>
                <span className={s.edit} aria-hidden="true">
                  Edit
                </span>
              </button>
              <div className={s.actions}>
                <button
                  type="button"
                  className={cn(s.btn, s.btnDanger)}
                  onClick={() => onDelete(project.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
