import { type Prisma } from '@prisma/client';
import { algoliasearch } from 'algoliasearch';

import { prisma } from '@/lib/prisma';

function getAlgoliaIndex() {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;
  const indexName = process.env.ALGOLIA_INDEX_NAME;

  if (!appId || !apiKey || !indexName) {
    return null;
  }

  return {
    client: algoliasearch(appId, apiKey),
    indexName
  };
}

export async function enqueueSearchSync(
  entityType: string,
  entityId: string,
  action: 'upsert' | 'delete',
  payload?: Record<string, unknown>
) {
  await prisma.searchIndexJob.create({
    data: {
      entityType,
      entityId,
      action,
      payload: payload as Prisma.InputJsonValue | undefined
    }
  });
}

export async function flushSearchQueue() {
  const algolia = getAlgoliaIndex();
  if (!algolia) return;

  const jobs = await prisma.searchIndexJob.findMany({
    where: {
      processedAt: null
    },
    take: 100
  });

  for (const job of jobs) {
    try {
      if (job.action === 'delete') {
        await algolia.client.deleteObject({
          indexName: algolia.indexName,
          objectID: `${job.entityType}:${job.entityId}`
        });
      } else {
        await algolia.client.addOrUpdateObject({
          indexName: algolia.indexName,
          objectID: `${job.entityType}:${job.entityId}`,
          body: {
            objectID: `${job.entityType}:${job.entityId}`,
            ...((job.payload as Record<string, unknown> | null) ?? {})
          }
        });
      }

      await prisma.searchIndexJob.update({
        where: { id: job.id },
        data: {
          processedAt: new Date()
        }
      });
    } catch (error) {
      console.error('SEARCH_SYNC_ERROR', error);
    }
  }
}
