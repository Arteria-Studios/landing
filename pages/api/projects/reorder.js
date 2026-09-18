import { isAdminAuthenticated } from 'lib/admin-auth'
import { prisma } from 'lib/prisma'

export default async function handler(req, res) {
  if (!isAdminAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { orderedIds } = req.body || {}

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ error: 'orderedIds must be a non-empty array' })
  }

  const uniqueIds = [...new Set(orderedIds)]
  if (uniqueIds.length !== orderedIds.length) {
    return res.status(400).json({ error: 'orderedIds must not contain duplicates' })
  }

  const existing = await prisma.project.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true },
  })

  if (existing.length !== orderedIds.length) {
    return res.status(400).json({ error: 'One or more project ids are invalid' })
  }

  const total = await prisma.project.count()
  if (total !== orderedIds.length) {
    return res.status(400).json({
      error: 'orderedIds must include every project',
    })
  }

  try {
    await prisma.$transaction(
      orderedIds.map((id, sortOrder) =>
        prisma.project.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    )

    const projects = await prisma.project.findMany({
      include: { media: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })

    return res.status(200).json({ items: projects })
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
}
