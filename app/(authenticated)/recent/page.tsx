import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import BoardsGrid from '@/app/partials/BoardsGrid';
import NotesGrid from '@/app/partials/NotesGrid';
import { getBoards } from '@/app/(authenticated)/boards/lib/actions';
import { getNotes } from '@/app/(authenticated)/boards/[id]/notes/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import { getTranslations } from 'next-intl/server';

export default async function RecentPage() {
  const { user } = await getCurrentSession();
  if (user === null) return null;

  const tNavigation = await getTranslations('Navigation');
  const t = await getTranslations('RecentPage');
  const [boards, notes] = await Promise.all([
    getBoards('updated_desc', 8),
    getNotes('updated_desc', 30, null),
  ]);

  const breadcrumbs = [
    { name: tNavigation('home'), href: '/' },
    { name: tNavigation('recent'), href: '/recent' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={breadcrumbs}
      />
      <PageBody>
        <div className="space-y-12 py-4">
          <BoardsGrid boards={boards ?? []} />
          <NotesGrid notes={notes ?? []} />
        </div>
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
