import BoardsGrid from '@/app/partials/BoardsGrid';
import { getBoards } from '@/app/(authenticated)/boards/lib/actions';

export default async function BoardsSection() {
  const boards = await getBoards('favorite_desc', 7);

  return <BoardsGrid boards={boards ?? []} />;
}
