import NavHeader from '@/components/NavHeader';
import NavMenu from '@/components/NavMenu';
import Page from '@/components/Page';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { redirect } from 'next/navigation';
import BoardFavSwitch from './components/BoardFavToggle';
import { getBoardsCount } from './lib/actions';
import { getCurrentSession } from './login/lib/actions';
import HomeTabs from './partials/HomeTabs';
import MainContent from '@/components/MainContent';
import { getBoards } from './boards/lib/actions';
import { getNotes } from './boards/[id]/notes/lib/actions';
import { Board } from '@/prisma/generated/client';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
  }

  const { showFav = 'false' } = await searchParams;
  const isShowFav = showFav === 'true';

  // Fetch data on the server
  const boardsCount = await getBoardsCount();
  const allBoards = await getBoards('created_desc', 20);
  const notes = await getNotes('created_desc', 8);

  const filteredBoards =
    allBoards
      ?.filter((board: Board) => (isShowFav ? board.favorite : true))
      .sort((a: Board, b: Board) => {
        if (isShowFav) return 0;
        return +b.favorite - +a.favorite;
      }) || [];

  const breadcrumbs = [{ name: 'Home', href: '/' }];

  return (
    <Page>
      <NavMenu user={user} />
      <MainContent>
        <NavHeader user={user} />
        <PageContainer>
          <PageHeader
            title={`Welcome back, ${user.name}`}
            breadcrumbs={breadcrumbs}
            description={`You have ${boardsCount} active board${boardsCount === 1 ? '' : 's'}. Here is your ${isShowFav ? 'favorite' : 'recent'} activity.`}
          >
            {boardsCount > 0 && (
              <div className="flex justify-end w-full md:w-auto">
                <BoardFavSwitch showFavParam={isShowFav} />
              </div>
            )}
          </PageHeader>
          <PageBody>
            <HomeTabs
              boards={filteredBoards}
              notes={notes || []}
              showFav={isShowFav}
            />
          </PageBody>
          <PageFooter />
        </PageContainer>
      </MainContent>
    </Page>
  );
}
