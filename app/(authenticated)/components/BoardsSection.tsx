import BoardsGrid from '@/app/partials/BoardsGrid';
import { getBoards } from '@/app/(authenticated)/boards/lib/actions';
import { Board } from '@/prisma/generated/client';

export default async function BoardsSection({
  showFav,
}: {
  showFav: boolean;
}) {
  const allBoards = await getBoards('created_desc', 7);

  const filteredBoards =
    allBoards
      ?.filter((board: Board) => (showFav ? board.favorite : true))
      .sort((a: Board, b: Board) => {
        if (showFav) return 0;
        return +b.favorite - +a.favorite;
      }) || [];

  return <BoardsGrid boards={filteredBoards} showFav={showFav} />;
}
