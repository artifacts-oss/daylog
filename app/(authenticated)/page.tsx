import { Suspense } from 'react';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import BoardFavSwitch from '@/app/(authenticated)/components/BoardFavToggle';
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    // This is now redundant but safe to keep as a double check
    return null;
  }

  const { showFav = 'false' } = await searchParams;
  const isShowFav = showFav === 'true';

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
          activity: isShowFav ? t('favoriteActivity') : t('recentActivity'),
        })}
      >
        {boardsCount > 0 && (
          <div className="flex justify-end w-full md:w-auto">
            <BoardFavSwitch showFavParam={isShowFav} />
          </div>
        )}
      </PageHeader>
      <PageBody>
        <div className="space-y-12 py-4">
          <Suspense fallback={<BoardsSkeleton />}>
            <BoardsSection showFav={isShowFav} />
          </Suspense>
          <Suspense fallback={<NotesSkeleton />}>
            <NotesSection showFav={isShowFav} />
          </Suspense>
        </div>
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
