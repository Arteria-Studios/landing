import cn from 'clsx'
import { MediaPreviewImage } from 'components/admin/media-preview-image'
import { OptimizedVideo } from 'components/optimized-video'
import { isVideoUrl } from 'lib/media-url'
import { MAX_UPLOAD_LABEL } from 'lib/upload-limits'
import { useCallback, useRef, useState } from 'react'
import s from './media-dropzone.module.scss'

const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'

/**
 * Media of a project: files dropped from the desktop are uploaded, and the
 * cards themselves are dragged to set the order they appear on the case page.
 * The arrow buttons do the same from the keyboard.
 */
export function MediaDropzone({
  items,
  onItemsChange,
  onUploadFile,
  onStatus,
  moveItem,
  updateMediaItem,
  removeMediaItem,
}) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)      // files over the grid
  const [dragIndex, setDragIndex] = useState(null)         // card being dragged
  // The same index in a ref: drag events can arrive before React re-renders.
  const dragRef = useRef(null)
  const [overIndex, setOverIndex] = useState(null)         // card it would land on
  const [uploadingIds, setUploadingIds] = useState([])
  const uploadLock = useRef(false)

  const uploadFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || [])
      if (!files.length || uploadLock.current) return

      uploadLock.current = true

      for (const file of files) {
        const pendingId = `pending-${Date.now()}-${Math.random()}`
        setUploadingIds((prev) => [...prev, pendingId])
        onStatus?.(`Uploading ${file.name}...`)

        try {
          const uploaded = await onUploadFile(file)
          onItemsChange((prev) =>
            prev
              .map((item, index) => ({ ...item, sortOrder: index }))
              .concat([{ ...uploaded, columnSpan: uploaded.columnSpan || 'two_columns' }])
              .map((item, index) => ({ ...item, sortOrder: index })),
          )
          onStatus?.(`${file.name} uploaded.`)
        } catch (error) {
          onStatus?.(error.message)
        } finally {
          setUploadingIds((prev) => prev.filter((id) => id !== pendingId))
        }
      }

      uploadLock.current = false
    },
    [onItemsChange, onUploadFile, onStatus],
  )

  const hasFiles = (event) =>
    Array.from(event.dataTransfer?.types || []).includes('Files')

  const onDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    if (hasFiles(event)) uploadFiles(event.dataTransfer.files)
    else endDrag()
  }

  /* ---------- Reordering ---------- */
  const endDrag = () => {
    dragRef.current = null
    setDragIndex(null)
    setOverIndex(null)
  }
  const dropOn = (index) => {
    const from = dragRef.current
    if (from === null || from === index) return endDrag()
    onItemsChange((prev) => moveItem(prev, from, index))
    onStatus?.('Media order updated.')
    endDrag()
  }
  const moveBy = (index, delta) => {
    const to = index + delta
    if (to < 0 || to >= items.length) return
    onItemsChange((prev) => moveItem(prev, index, to))
  }

  return (
    <div className={s.root}>
      <p className={s.hint}>
        Drag cards to set the order on the page · JPEG, PNG, WebP, GIF (image),
        or MP4/WebM (video) · max {MAX_UPLOAD_LABEL} each
      </p>
      <div
        className={cn(s.grid, isDragging && s.dragging)}
        onDragEnter={(e) => {
          if (!hasFiles(e)) return
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault()
          if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
        }}
        onDrop={onDrop}
      >
        {items.map((item, index) => (
          <article
            className={cn(
              s.card,
              dragIndex === index && s.cardDragging,
              overIndex === index && dragIndex !== index && s.cardOver,
            )}
            key={item.id || item.url || `media-${index}`}
            draggable
            onDragStart={(event) => {
              dragRef.current = index
              setDragIndex(index)
              event.dataTransfer.effectAllowed = 'move'
              // Some browsers need data for a drag to start at all.
              event.dataTransfer.setData('text/plain', String(index))
            }}
            onDragEnd={endDrag}
            onDragOver={(event) => {
              if (dragRef.current === null) return
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              if (overIndex !== index) setOverIndex(index)
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setOverIndex(null)
            }}
            onDrop={(event) => {
              if (dragRef.current === null) return
              event.preventDefault()
              event.stopPropagation()
              dropOn(index)
            }}
          >
            <div className={s.preview}>
              <span className={s.order}>{index + 1}</span>
              {item.kind === 'video' || isVideoUrl(item.url) ? (
                <OptimizedVideo src={item.url} className={s.videoPreview} />
              ) : (
                <MediaPreviewImage
                  src={item.url}
                  alt={item.title || 'Media'}
                />
              )}
            </div>
            <div className={s.cardBody}>
              <p className={s.cardTitle}>{item.title || `Media ${index + 1}`}</p>
              <label className={s.cardLabel}>
                Width
                <select
                  className={s.select}
                  value={item.columnSpan}
                  onChange={(event) =>
                    updateMediaItem(index, { columnSpan: event.target.value })
                  }
                >
                  <option value="one_column">1 column</option>
                  <option value="two_columns">2 columns</option>
                </select>
              </label>
              <div className={s.cardActions}>
                <button
                  type="button"
                  className={s.cardBtn}
                  aria-label="Move earlier"
                  disabled={index === 0}
                  onClick={() => moveBy(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={s.cardBtn}
                  aria-label="Move later"
                  disabled={index === items.length - 1}
                  onClick={() => moveBy(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={cn(s.cardBtn, s.cardBtnDanger)}
                  onClick={() => removeMediaItem(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          </article>
        ))}

        {uploadingIds.map((id) => (
          <div className={cn(s.card, s.cardPending)} key={id}>
            <div className={s.preview}>
              <span className={s.spinner} />
            </div>
            <p className={s.cardTitle}>Uploading…</p>
          </div>
        ))}

        <button
          type="button"
          className={cn(s.card, s.dropCard)}
          onClick={() => inputRef.current?.click()}
        >
          <span className={s.dropIcon}>+</span>
          <span className={s.dropText}>Drop files or click to add</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className={s.hiddenInput}
        accept={ACCEPT}
        multiple
        onChange={(event) => {
          uploadFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
