import { isAdminAuthenticated } from 'lib/admin-auth'
import { prisma } from 'lib/prisma'

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const page = Math.max(Number(req.query.page || 1), 1)
  const pageSize = Math.min(Math.max(Number(req.query.pageSize || 20), 1), 100)
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.contactRequest.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.contactRequest.count(),
  ])

  return res.status(200).json({
    items,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  })
}
