import cn from 'clsx'
import { MediaPreviewImage } from 'components/admin/media-preview-image'
import { OptimizedVideo } from 'components/optimized-video'
import { isVideoUrl } from 'lib/media-url'
import { MAX_UPLOAD_LABEL } from 'lib/upload-limits'
import { useCallback, useRef, useState } from 'react'
import s from './media-dropzone.module.scss'

const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm'

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
  const [isDragging, setIsDragging] = useState(false)
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

  const onDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    uploadFiles(event.dataTransfer.files)
  }

  return (
    <div className={s.root}>
      <p className={s.hint}>
        JPEG, PNG, WebP, GIF (image), or MP4/WebM (video) · max {MAX_UPLOAD_LABEL}{' '}
        each
      </p>
      <div
        className={cn(s.grid, isDragging && s.dragging)}
        onDragEnter={(e) => {
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
            className={s.card}
            key={item.id || item.url || `media-${index}`}
          >
            <div className={s.preview}>
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
                  disabled={index === 0}
                  onClick={() => onItemsChange((prev) => moveItem(prev, index, index - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={s.cardBtn}
                  disabled={index === items.length - 1}
                  onClick={() => onItemsChange((prev) => moveItem(prev, index, index + 1))}
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
