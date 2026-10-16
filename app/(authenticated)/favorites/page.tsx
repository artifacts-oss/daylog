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

export default async function FavoritesPage() {
  const { user } = await getCurrentSession();
  if (user === null) return null;

  const tNavigation = await getTranslations('Navigation');
  const t = await getTranslations('FavoritesPage');
  const [boards, notes] = await Promise.all([
    getBoards('created_desc', 0, true),
    getNotes('created_desc', 0, null, true),
  ]);

  const breadcrumbs = [
    { name: tNavigation('home'), href: '/' },
    { name: tNavigation('favorites'), href: '/favorites' },
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
          <BoardsGrid boards={boards ?? []} showFav />
          <NotesGrid notes={notes ?? []} showFav />
        </div>
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
