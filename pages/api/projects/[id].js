import { isAdminAuthenticated } from 'lib/admin-auth'
import { prisma } from 'lib/prisma'

const parseArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const mapColumnSpan = (value) =>
  value === 'one_column' || value === 'ONE_COLUMN' ? 'ONE_COLUMN' : 'TWO_COLUMNS'

const mapMediaItem = (item, index) => ({
  id: item.id || undefined,
  kind: item.kind === 'video' || item.kind === 'VIDEO' ? 'VIDEO' : 'IMAGE',
  title: item.title || null,
  url: item.url,
  s3Key: item.s3Key,
  contentType: item.contentType || null,
  sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
  columnSpan: mapColumnSpan(item.columnSpan),
})

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id) {
    return res.status(400).json({ error: 'Project id is required' })
  }

  if (req.method === 'PUT') {
    try {
      const {
        name,
        industry,
        body,
        testimonial,
        services,
        stack,
        link,
        mediaLayout,
        mediaItems = [],
      } = req.body || {}

      if (!name) {
        return res.status(400).json({ error: 'name is required' })
      }

      await prisma.projectMedia.deleteMany({ where: { projectId: id } })

      const project = await prisma.project.update({
        where: { id },
        data: {
          name,
          industry: industry || null,
          body: body || null,
          testimonial: testimonial || null,
          services: Array.isArray(services) ? services : parseArray(services),
          stack: Array.isArray(stack) ? stack : parseArray(stack),
          link: link || null,
          mediaLayout:
            mediaLayout === 'full_width' ? 'FULL_WIDTH' : 'TWO_COLUMNS',
          media: {
            create: mediaItems.map(mapMediaItem),
          },
        },
        include: { media: { orderBy: { sortOrder: 'asc' } } },
      })

      return res.status(200).json({ item: project })
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.project.delete({ where: { id } })
      return res.status(200).json({ ok: true })
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
