import { isAdminAuthenticated } from 'lib/admin-auth'
import { prisma } from 'lib/prisma'
import { readCategory } from 'lib/service-categories'

const listServices = () =>
  prisma.studioService.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const items = await listServices()
      return res.status(200).json({ items })
    } catch (error) {
      return res.status(503).json({ error: 'Services are temporarily unavailable' })
    }
  }

  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    try {
      const { name, category, description } = req.body || {}
      const trimmed = String(name || '').trim()

      if (!trimmed) {
        return res.status(400).json({ error: 'name is required' })
      }

      const { _max } = await prisma.studioService.aggregate({
        _max: { sortOrder: true },
      })
      const nextSortOrder = (_max.sortOrder ?? -1) + 1

      const item = await prisma.studioService.create({
        data: {
          name: trimmed,
          category: readCategory(category),
          description: String(description || '').trim() || null,
          sortOrder: nextSortOrder,
        },
      })

      return res.status(201).json({ item })
    } catch (error) {
      return res.status(400).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
