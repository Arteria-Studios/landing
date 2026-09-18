import { prisma } from 'lib/prisma'

export { SERVICE_CATEGORIES, readCategory } from 'lib/service-categories'

/**
 * Projects and services in the shape the static frontend (public/assets/*.js) reads.
 * A project's card shows its first image as the poster and plays its first video.
 */
export async function getSiteData() {
  const [projects, services] = await Promise.all([
    prisma.project.findMany({
      include: { media: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.studioService.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  return {
    projects: projects.map((project) => {
      const image = project.media.find((item) => item.kind === 'IMAGE')
      const video = project.media.find((item) => item.kind === 'VIDEO')
      return {
        id: project.id,
        title: project.name,
        tag: project.services.join(', ') || project.industry || '',
        industry: project.industry,
        body: project.body,
        testimonial: project.testimonial,
        services: project.services,
        stack: project.stack,
        link: project.link,
        img: image?.url || null,
        video: video?.url || null,
        media: project.media.map((item) => ({
          kind: item.kind === 'VIDEO' ? 'video' : 'image',
          url: item.url,
          title: item.title,
          span: item.columnSpan === 'ONE_COLUMN' ? 1 : 2,
        })),
      }
    }),
    services: services.map((service) => ({
      name: service.name,
      category: service.category,
      description: service.description,
    })),
  }
}
