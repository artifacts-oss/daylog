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
import HomeTabs from '@/app/partials/HomeTabs';
import { getBoards } from '@/app/(authenticated)/boards/lib/actions';
import { getNotes } from '@/app/(authenticated)/boards/[id]/notes/lib/actions';
import { Board } from '@/prisma/generated/client';
import { getImageUrlOrFile } from '@/utils/image';

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

  // Fetch data on the server
  const boardsCount = await getBoardsCount();
  const latestBoardImage = await getLatestBoardImage();
  const allBoards = await getBoards('created_desc', 20);
  const notes = await getNotes('created_desc', 20);

  const filteredBoards =
    allBoards
      ?.filter((board: Board) => (isShowFav ? board.favorite : true))
      .sort((a: Board, b: Board) => {
        if (isShowFav) return 0;
        return +b.favorite - +a.favorite;
      }) || [];

  const filteredNotes =
    notes?.filter((note) => (isShowFav ? note.favorite : true)) || [];

  const breadcrumbs = [{ name: 'Home', href: '/' }];

  return (
    <PageContainer>
      <PageHeader
        title={`Welcome back, ${user.name}`}
        breadcrumbs={breadcrumbs}
        imageUrl={getImageUrlOrFile(latestBoardImage ?? '')}
        description={`You have ${boardsCount} active board${
          boardsCount === 1 ? '' : 's'
        }. Here is your ${isShowFav ? 'favorite' : 'recent'} activity.`}
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
          notes={filteredNotes}
          showFav={isShowFav}
        />
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
