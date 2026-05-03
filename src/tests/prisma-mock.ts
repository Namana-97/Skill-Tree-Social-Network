import { jest } from '@jest/globals';

type MockTree = Record<string, unknown>;

export const prismaMock = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    upsert: jest.fn()
  },
  skill: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  skillEvidence: {
    createMany: jest.fn(),
    findMany: jest.fn()
  },
  skillEdge: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  vouch: {
    create: jest.fn(),
    findMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  match: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn()
  },
  siteSetting: {
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  testimonial: {
    findMany: jest.fn(),
    upsert: jest.fn()
  },
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  analyticsEvent: {
    create: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn()
  },
  searchIndexJob: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  upload: {
    create: jest.fn(),
    update: jest.fn()
  },
  $transaction: jest.fn(async (callback: (tx: typeof prismaMock) => unknown) =>
    callback(prismaMock)
  )
};

function clearMocks(value: unknown) {
  if (!value || typeof value !== 'object') return;

  for (const entry of Object.values(value as MockTree)) {
    if (typeof entry === 'function' && 'mockClear' in entry) {
      (entry as jest.Mock).mockClear();
      continue;
    }

    clearMocks(entry);
  }
}

export function resetPrismaMock() {
  clearMocks(prismaMock);
  prismaMock.$transaction.mockImplementation(
    async (callback: (tx: typeof prismaMock) => unknown) => callback(prismaMock)
  );
}
