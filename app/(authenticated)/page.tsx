import { Suspense } from 'react';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import {
  getBoardsCount,
  getLatestBoardImage,
} from '@/app/(authenticated)/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import BoardsSection from '@/app/(authenticated)/components/BoardsSection';
import NotesSection from '@/app/(authenticated)/components/NotesSection';
import {
  BoardsSkeleton,
  NotesSkeleton,
} from '@/app/(authenticated)/components/HomeSkeletons';
import { getImageUrlOrFile } from '@/utils/image';
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {
    // This is now redundant but safe to keep as a double check
    return null;
  }

  // Only the cheap header data is awaited here so the header renders right away.
  // Boards and Notes stream in independently via their own Suspense boundaries.
  const [boardsCount, latestBoardImage] = await Promise.all([
    getBoardsCount(),
    getLatestBoardImage(),
  ]);

  const t = await getTranslations('HomePage');
  const breadcrumbs = [{ name: t('breadcrumb'), href: '/' }];

  return (
    <PageContainer>
      <PageHeader
        title={t('title', { name: user.name ?? '' })}
        breadcrumbs={breadcrumbs}
        imageUrl={getImageUrlOrFile(latestBoardImage ?? '')}
        description={t('description', {
          count: boardsCount,
          activity: t('recentActivity'),
        })}
      />
      <PageBody>
        <div className="space-y-12 py-4">
          <Suspense fallback={<BoardsSkeleton />}>
            <BoardsSection />
          </Suspense>
          <Suspense fallback={<NotesSkeleton />}>
            <NotesSection />
          </Suspense>
        </div>
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
