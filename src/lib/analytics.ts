import { type Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export async function trackEvent(input: {
  userId?: number | null;
  eventName: string;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return prisma.analyticsEvent.create({
    data: {
      userId: input.userId ?? null,
      eventName: input.eventName,
      path: input.path ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined
    }
  });
}

export async function getAnalyticsSummary() {
  const [totalEvents, activeUsers, topEvents] = await Promise.all([
    prisma.analyticsEvent.count(),
    prisma.analyticsEvent.groupBy({
      by: ['userId'],
      _count: true,
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        userId: {
          not: null
        }
      }
    }),
    prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      _count: true,
      orderBy: {
        _count: {
          eventName: 'desc'
        }
      },
      take: 10
    })
  ]);

  return {
    totalEvents,
    activeUsers30d: activeUsers.length,
    topEvents: topEvents.map((item) => ({
      eventName: item.eventName,
      count: item._count
    }))
  };
}
