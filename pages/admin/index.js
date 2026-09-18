import { MediaDropzone } from 'components/admin/media-dropzone'
import { ProjectSortList } from 'components/admin/project-sort-list'
import { ProjectDrawer } from 'components/admin/project-drawer'
import { ServiceSortList } from 'components/admin/service-sort-list'
import { clearSessionCookie, isAdminAuthenticated } from 'lib/admin-auth'
import { uploadFileToBlob } from 'lib/admin-blob-upload'
import { parseApiResponse } from 'lib/parse-api-response'
import { SERVICE_CATEGORIES } from 'lib/service-categories'
import cn from 'clsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import s from './admin.module.scss'

// Bento tiles on the home page, in the order they appear there.
const CATEGORY_LABELS = {
  ai: 'AI',
  development: 'Development',
  design: 'Design',
  branding: 'Branding',
  product: 'Product',
  strategy: 'Strategy',
  motion: 'Motion & 3D',
  promotion: 'Promotion',
}

const emptyService = { name: '', category: '', description: '' }

// Same slug the public site uses in project.html?p=<slug>.
const slugOf = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const emptyForm = {
  name: '',
  industry: '',
  body: '',
  testimonial: '',
  services: '',
  stack: '',
  link: '',
  mediaLayout: 'two_columns',
}

const projectToForm = (project) => ({
  name: project.name || '',
  industry: project.industry || '',
  body: project.body || '',
  testimonial: project.testimonial || '',
  services: (project.services || []).join(', '),
  stack: (project.stack || []).join(', '),
  link: project.link || '',
  mediaLayout:
    project.mediaLayout === 'FULL_WIDTH' ? 'full_width' : 'two_columns',
})

const projectToMediaItems = (project) =>
  (project.media || []).map((item, index) => ({
    id: item.id,
    kind: item.kind === 'VIDEO' ? 'video' : 'image',
    title: item.title || '',
    url: item.url,
    s3Key: item.s3Key,
    contentType: item.contentType || '',
    sortOrder: item.sortOrder ?? index,
    columnSpan: item.columnSpan === 'ONE_COLUMN' ? 'one_column' : 'two_columns',
  }))

const normalizeMediaItems = (items) =>
  items.map((item, index) => ({ ...item, sortOrder: index }))

const moveItem = (items, from, to) => {
  if (to < 0 || to >= items.length) return items
  const next = [...items]
  const [removed] = next.splice(from, 1)
  next.splice(to, 0, removed)
  return normalizeMediaItems(next)
}

export default function AdminPage({ authenticated }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authenticated)
  const [password, setPassword] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [mediaItems, setMediaItems] = useState([])
  const [status, setStatus] = useState('')
  const [contacts, setContacts] = useState([])
  const [projects, setProjects] = useState([])
  const [services, setServices] = useState([])
  const [serviceForm, setServiceForm] = useState(emptyService)
  const [editingServiceId, setEditingServiceId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('projects')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name])
  const isEditing = Boolean(editingId)

  const resetProjectForm = useCallback(() => {
    setForm(emptyForm)
    setMediaItems([])
    setEditingId(null)
    setDrawerOpen(false)
    setStatus('')
  }, [])

  const login = async (event) => {
    event.preventDefault()
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!response.ok) {
      setStatus('Login failed. Check ADMIN_PASSWORD secret.')
      return
    }
    setStatus('')
    setIsAuthenticated(true)
  }

  const logout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    setIsAuthenticated(false)
    setStatus('')
    resetProjectForm()
    setProjects([])
    setContacts([])
    setServices([])
  }

  const fetchContacts = async () => {
    const response = await fetch('/api/contact/requests')
    const { data: payload } = await parseApiResponse(response)
    if (response.ok) {
      setContacts(payload.items)
    }
  }

  const fetchProjects = async () => {
    const response = await fetch('/api/projects')
    const { data: payload } = await parseApiResponse(response)
    if (response.ok) {
      setProjects(payload.items)
    }
  }

  const fetchServices = async () => {
    const response = await fetch('/api/services')
    const { data: payload } = await parseApiResponse(response)
    if (response.ok) {
      setServices(payload.items)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetchContacts()
    fetchProjects()
    fetchServices()
  }, [isAuthenticated])

  const resetServiceForm = () => {
    setServiceForm(emptyService)
    setEditingServiceId(null)
  }

  const saveService = async (event) => {
    event.preventDefault()
    const trimmed = serviceForm.name.trim()
    if (!trimmed) return

    const isEditingService = Boolean(editingServiceId)
    setStatus(isEditingService ? 'Updating service...' : 'Adding service...')
    const response = await fetch(
      isEditingService ? `/api/services/${editingServiceId}` : '/api/services',
      {
        method: isEditingService ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...serviceForm, name: trimmed }),
      },
    )
    const { data: payload } = await parseApiResponse(response)
    if (!response.ok) {
      setStatus(payload.error || 'Failed to save service')
      return
    }

    resetServiceForm()
    setStatus(isEditingService ? 'Service updated.' : 'Service added.')
    fetchServices()
  }

  const editService = (service) => {
    setEditingServiceId(service.id)
    setServiceForm({
      name: service.name || '',
      category: service.category || '',
      description: service.description || '',
    })
    setStatus('')
  }

  const deleteService = async (serviceId) => {
    if (!window.confirm('Delete this service?')) return

    setStatus('Deleting service...')
    const response = await fetch(`/api/services/${serviceId}`, {
      method: 'DELETE',
    })
    const { data: payload } = await parseApiResponse(response)
    if (!response.ok) {
      setStatus(payload.error || 'Failed to delete service')
      return
    }

    setStatus('Service deleted.')
    fetchServices()
  }

  const uploadFile = useCallback((file) => uploadFileToBlob(file), [])

  const openCreateDrawer = () => {
    setEditingId(null)
    setForm(emptyForm)
    setMediaItems([])
    setStatus('')
    setDrawerOpen(true)
  }

  const startEdit = (project) => {
    setEditingId(project.id)
    setForm(projectToForm(project))
    setMediaItems(projectToMediaItems(project))
    setStatus('')
    setDrawerOpen(true)
  }

  const submitProject = async (event) => {
    event.preventDefault()
    setStatus(isEditing ? 'Updating project...' : 'Saving project...')

    try {
      const payload = {
        ...form,
        mediaItems: normalizeMediaItems(mediaItems),
      }

      const response = await fetch(
        isEditing ? `/api/projects/${editingId}` : '/api/projects',
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const { data } = await parseApiResponse(response)
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save project')
      }

      setStatus(isEditing ? 'Project updated.' : 'Project created.')
      resetProjectForm()
      fetchProjects()
    } catch (error) {
      setStatus(error.message)
    }
  }

  const deleteProject = async (projectId) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) {
      return
    }

    setStatus('Deleting project...')
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    })
    const { data: payload } = await parseApiResponse(response)
    if (!response.ok) {
      setStatus(payload.error || 'Failed to delete project')
      return
    }

    if (editingId === projectId) {
      resetProjectForm()
    }
    setStatus('Project deleted.')
    fetchProjects()
  }

  const removeMediaItem = (index) => {
    setMediaItems((prev) => normalizeMediaItems(prev.filter((_, i) => i !== index)))
  }

  const updateMediaItem = (index, patch) => {
    setMediaItems((prev) =>
      normalizeMediaItems(
        prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
      ),
    )
  }

  if (!isAuthenticated) {
    return (
      <main className={s.page}>
        <div className={s.container}>
          <h1 className={s.title}>Admin Login</h1>
          <form className={s.card} onSubmit={login}>
            <div className={s.field}>
              <label htmlFor="password">Admin password</label>
              <input
                id="password"
                className={s.input}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className={s.actions}>
              <button className={s.button} type="submit">
                Login
              </button>
            </div>
            {status && <p className={s.status}>{status}</p>}
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className={s.page}>
      <div className={s.container}>
        <header className={s.topBar}>
          <h1 className={s.title}>ArteriaStudios Admin</h1>
          <div className={s.actions}>
            <button
              className={s.button}
              type="button"
              onClick={() => {
                if (activeTab === 'projects') fetchProjects()
                else if (activeTab === 'contacts') fetchContacts()
                else fetchServices()
              }}
            >
              Refresh
            </button>
            <button className={s.button} type="button" onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        <nav className={s.tabs} aria-label="Admin sections">
          <button
            type="button"
            className={cn(s.tab, activeTab === 'projects' && s.tabActive)}
            onClick={() => setActiveTab('projects')}
          >
            Projects ({projects.length})
          </button>
          <button
            type="button"
            className={cn(s.tab, activeTab === 'contacts' && s.tabActive)}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts ({contacts.length})
          </button>
          <button
            type="button"
            className={cn(s.tab, activeTab === 'services' && s.tabActive)}
            onClick={() => setActiveTab('services')}
          >
            Services ({services.length})
          </button>
        </nav>

        {status && !drawerOpen && <p className={s.statusBanner}>{status}</p>}

        {activeTab === 'projects' && (
          <section className={cn(s.card, s.cardPanel)}>
            <div className={s.sectionHead}>
              <h2>Projects</h2>
              <button className={cn(s.button, s.buttonAccent)} type="button" onClick={openCreateDrawer}>
                Add project
              </button>
            </div>
            <div className={s.cardScroll}>
              <ProjectSortList
                projects={projects}
                onProjectsChange={setProjects}
                onEdit={startEdit}
                onDelete={deleteProject}
                onStatus={setStatus}
              />
            </div>
          </section>
        )}

        {activeTab === 'services' && (
          <section className={cn(s.card, s.cardPanel)}>
            <div className={s.sectionHead}>
              <h2>Services</h2>
            </div>
            <form className={s.serviceAdd} onSubmit={saveService}>
              <input
                className={s.input}
                value={serviceForm.name}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="e.g. Brand identity, Web apps"
                aria-label="Service name"
              />
              <select
                className={s.select}
                value={serviceForm.category}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, category: event.target.value }))
                }
                aria-label="Home page tile"
              >
                <option value="">No tile (hidden on the home page)</option>
                {SERVICE_CATEGORIES.map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
              <input
                className={cn(s.input, s.serviceTip)}
                value={serviceForm.description}
                onChange={(event) =>
                  setServiceForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Popover text shown on hover"
                aria-label="Popover text"
              />
              <button
                className={cn(s.button, s.buttonAccent)}
                type="submit"
                disabled={!serviceForm.name.trim()}
              >
                {editingServiceId ? 'Save service' : 'Add service'}
              </button>
              {editingServiceId && (
                <button className={s.button} type="button" onClick={resetServiceForm}>
                  Cancel
                </button>
              )}
            </form>
            <div className={s.cardScroll}>
              <ServiceSortList
                services={services}
                onServicesChange={setServices}
                onEdit={editService}
                onDelete={deleteService}
                onStatus={setStatus}
              />
            </div>
          </section>
        )}

        {activeTab === 'contacts' && (
          <section className={cn(s.card, s.cardPanel)}>
            <h2>Contact requests</h2>
            <div className={cn(s.tableWrap, s.cardScroll)}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Services</th>
                    <th>Budget</th>
                    <th>Timeline</th>
                    <th>Message</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length === 0 && (
                    <tr>
                      <td className={s.muted} colSpan={8}>
                        No contact requests yet.
                      </td>
                    </tr>
                  )}
                  {contacts.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.company || '-'}</td>
                      <td>{(item.services || []).join(', ') || '-'}</td>
                      <td>{item.budget || '-'}</td>
                      <td>{item.timeline || '-'}</td>
                      <td>
                        {item.message}
                        {item.phone && <div className={s.muted}>{item.phone}</div>}
                      </td>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <ProjectDrawer
        open={drawerOpen}
        title={isEditing ? 'Edit project' : 'New project'}
        onClose={resetProjectForm}
      >
        <form className={s.drawerForm} onSubmit={submitProject}>
          <div className={s.grid}>
            <div className={s.field}>
              <label>Name</label>
              <input
                className={s.input}
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
            </div>
            <div className={s.field}>
              <label>Industry</label>
              <input
                className={s.input}
                value={form.industry}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, industry: event.target.value }))
                }
              />
            </div>
            <div className={`${s.field} ${s.full}`}>
              <label>Body / Description</label>
              <textarea
                className={s.textarea}
                value={form.body}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, body: event.target.value }))
                }
              />
            </div>
            <div className={s.field}>
              <label>Services (comma separated)</label>
              <input
                className={s.input}
                value={form.services}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, services: event.target.value }))
                }
              />
            </div>
            <div className={s.field}>
              <label>Stack (comma separated)</label>
              <input
                className={s.input}
                value={form.stack}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, stack: event.target.value }))
                }
              />
            </div>
            <div className={`${s.field} ${s.full}`}>
              <label>Project URL</label>
              <input
                className={s.input}
                value={form.link}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, link: event.target.value }))
                }
              />
            </div>
            <div className={`${s.field} ${s.full}`}>
              <label>Testimonial</label>
              <textarea
                className={s.textarea}
                value={form.testimonial}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, testimonial: event.target.value }))
                }
              />
            </div>
            <div className={`${s.field} ${s.full}`}>
              <label>Media</label>
              <MediaDropzone
                items={mediaItems}
                onItemsChange={setMediaItems}
                onUploadFile={uploadFile}
                onStatus={setStatus}
                moveItem={moveItem}
                updateMediaItem={updateMediaItem}
                removeMediaItem={removeMediaItem}
              />
            </div>
          </div>

          <div className={s.drawerActions}>
            {isEditing && form.name.trim() && (
              <a
                className={s.button}
                href={`/project.html?p=${slugOf(form.name)}`}
                target="_blank"
                rel="noreferrer"
              >
                View on site
              </a>
            )}
            <button className={s.button} type="submit" disabled={!canSubmit}>
              {isEditing ? 'Save changes' : 'Create project'}
            </button>
            <button className={s.button} type="button" onClick={resetProjectForm}>
              Cancel
            </button>
          </div>
          {status && <p className={s.status}>{status}</p>}
        </form>
      </ProjectDrawer>
    </main>
  )
}

export async function getServerSideProps({ req, res }) {
  const authenticated = isAdminAuthenticated(req)
  if (!authenticated && req.cookies?.arteria_admin_session) {
    res.setHeader('Set-Cookie', clearSessionCookie())
  }

  return {
    props: {
      authenticated,
    },
  }
}
