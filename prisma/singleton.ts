import { PrismaClient } from '@/prisma/generated/client';
import { beforeEach, vi } from 'vitest';
import { DeepMockProxy, mockDeep, mockReset } from 'vitest-mock-extended';

import { prisma } from '@/prisma/client';

vi.mock('@/prisma/client', () => {
  return {
    __esModule: true,
    prisma: mockDeep<PrismaClient>(),
  };
});

beforeEach(() => {
  mockReset(prismaMock);
});

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
