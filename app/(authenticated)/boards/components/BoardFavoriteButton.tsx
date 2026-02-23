'use client';

import { updateBoard } from '@/app/(authenticated)/boards/lib/actions';
import { Board } from '@/prisma/generated/client';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type BoardFavoriteButtonType = {
  board: Board;
};

export default function BoardFavoriteButton({
  board,
}: BoardFavoriteButtonType) {
  const router = useRouter();

  const handleFavoriteClick = async () => {
    board.favorite = !board.favorite;
    await updateBoard(board);
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-white hover:text-accent-red hover:bg-white/10"
      onClick={handleFavoriteClick}
    >
      {board.favorite ? (
        <HeartSolidIcon
          data-testid="filled-heart"
          className="h-5 w-5 text-accent-red"
        />
      ) : (
        <HeartIcon className="h-5 w-5" />
      )}
      <span className="sr-only">
        {board.favorite ? 'Remove from favorites' : 'Add to favorites'}
      </span>
    </Button>
  );
}
