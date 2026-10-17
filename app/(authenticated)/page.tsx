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
import {
  ActivitySection,
  ContinueSection,
  ExpiringSharesSection,
  ForgottenSection,
  OnThisDaySection,
  StatsSection,
} from '@/app/(authenticated)/components/HomeSections';
import { SectionSkeleton } from '@/app/(authenticated)/components/HomeSkeletons';
import { getImageUrlOrFile } from '@/utils/image';
import { getTranslations } from 'next-intl/server';

export default async function Home() {
  const { user } = await getCurrentSession();
  if (user === null) {
    // This is now redundant but safe to keep as a double check
    return null;
  }

  // Only the cheap header data is awaited here so the header renders right away.
  // Each dashboard section streams in independently via its own Suspense boundary.
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
        <div className="flex flex-col gap-8 py-4">
          <div className="flex flex-wrap gap-4">
            <div className="min-w-0 flex-[2_1_520px]">
              <Suspense fallback={<SectionSkeleton className="h-52" />}>
                <ContinueSection />
              </Suspense>
            </div>
            <div className="min-w-0 flex-[1_1_300px]">
              <Suspense fallback={<SectionSkeleton className="h-52" />}>
                <StatsSection />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={<SectionSkeleton className="h-36" />}>
            <ActivitySection />
          </Suspense>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Suspense fallback={<SectionSkeleton className="h-48" />}>
              <OnThisDaySection />
            </Suspense>
            <Suspense fallback={<SectionSkeleton className="h-48" />}>
              <ForgottenSection />
            </Suspense>
            <Suspense fallback={<SectionSkeleton className="h-48" />}>
              <ExpiringSharesSection />
            </Suspense>
          </div>
        </div>
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
