/**
 * Fills an empty database with the projects and services the landing shipped with
 * (prisma/seed-data.json, generated from the original static frontend).
 * Safe to re-run: tables that already have rows are left alone.
 *
 *   npm run db:seed
 */
const { PrismaClient } = require('@prisma/client')
const data = require('./seed-data.json')

const prisma = new PrismaClient()

async function main() {
  if ((await prisma.project.count()) === 0) {
    for (const [sortOrder, project] of data.projects.entries()) {
      await prisma.project.create({
        data: {
          name: project.name,
          services: project.services,
          stack: [],
          sortOrder,
          media: {
            create: project.media.map((item, index) => ({
              kind: item.kind,
              title: item.title,
              url: item.url,
              // Bundled media lives in /public, not in Blob storage.
              s3Key: item.url,
              contentType: item.kind === 'VIDEO' ? 'video/mp4' : null,
              sortOrder: index,
            })),
          },
        },
      })
    }
    console.log(`Seeded ${data.projects.length} projects`)
  } else {
    console.log('Projects already present, skipped')
  }

  if ((await prisma.studioService.count()) === 0) {
    await prisma.studioService.createMany({
      data: data.services.map((service, sortOrder) => ({ ...service, sortOrder })),
    })
    console.log(`Seeded ${data.services.length} services`)
  } else {
    console.log('Services already present, skipped')
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
