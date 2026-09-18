import { isAdminAuthenticated } from 'lib/admin-auth'
import { prisma } from 'lib/prisma'

const parseArray = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const projects = await prisma.project.findMany({
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
    return res.status(200).json({ items: projects })
  }

  if (req.method === 'POST') {
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

      const { _max } = await prisma.project.aggregate({
        _max: { sortOrder: true },
      })
      const nextSortOrder = (_max.sortOrder ?? -1) + 1

      const project = await prisma.project.create({
        data: {
          name,
          sortOrder: nextSortOrder,
          industry: industry || null,
          body: body || null,
          testimonial: testimonial || null,
          services: Array.isArray(services) ? services : parseArray(services),
          stack: Array.isArray(stack) ? stack : parseArray(stack),
          link: link || null,
          mediaLayout: mediaLayout === 'full_width' ? 'FULL_WIDTH' : 'TWO_COLUMNS',
          media: {
            create: mediaItems.map((item, index) => ({
              kind: item.kind === 'video' ? 'VIDEO' : 'IMAGE',
              title: item.title || null,
              url: item.url,
              s3Key: item.s3Key,
              contentType: item.contentType || null,
              sortOrder:
                typeof item.sortOrder === 'number' ? item.sortOrder : index,
              columnSpan:
                item.columnSpan === 'one_column' ||
                item.columnSpan === 'ONE_COLUMN'
                  ? 'ONE_COLUMN'
                  : 'TWO_COLUMNS',
            })),
          },
        },
        include: { media: { orderBy: { sortOrder: 'asc' } } },
      })

      return res.status(201).json({ item: project })
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
