import { ShareView } from '@/prisma/generated/client';

export interface SharedContent {
  id: string;
  title: string;
  entityType: string;
  entityId: number;
  hasPassword: boolean;
  expiresAt: Date | null;
  oneTime: boolean;
  viewCount: number;
  metrics: {
    weekly: number;
    monthly: number;
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
  views: ShareView[];
}
