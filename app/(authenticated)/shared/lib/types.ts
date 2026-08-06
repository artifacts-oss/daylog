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
  scope: string;
  canEdit: boolean;
  snapshotUpdatedAt: Date | null;
  recipients: { id: number; name: string | null; email: string; profileImage: string | null }[];
  metrics: {
    weekly: number;
    monthly: number;
    total: number;
  };
  createdAt: Date;
  updatedAt: Date;
  views: ShareView[];
}
