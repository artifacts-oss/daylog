'use client';

import { updateBoard } from '@/app/(authenticated)/boards/lib/actions';
import { Board } from '@/prisma/generated/client';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { startTransition, useOptimistic } from 'react';
import { Button } from '@/components/ui/button';

type BoardFavoriteButtonType = {
  board: Board;
};

export default function BoardFavoriteButton({
  board,
}: BoardFavoriteButtonType) {
  const router = useRouter();

  // Flip the heart immediately; it falls back to the server value if the update fails.
  const [favorite, setOptimisticFavorite] = useOptimistic(board.favorite);

  const handleFavoriteClick = () => {
    startTransition(async () => {
      setOptimisticFavorite(!favorite);
      try {
        await updateBoard({ ...board, favorite: !favorite });
        router.refresh();
      } catch (e) {
        console.error(e); // the optimistic heart reverts on its own
      }
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-white hover:text-red-400 hover:bg-white/10 transition-all duration-150"
      onClick={handleFavoriteClick}
    >
      {favorite ? (
        <HeartSolidIcon
          data-testid="filled-heart"
          className="h-5 w-5 text-red-500 scale-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-150"
        />
      ) : (
        <HeartIcon className="h-5 w-5 transition-all duration-150" />
      )}
      <span className="sr-only">
        {favorite ? 'Remove from favorites' : 'Add to favorites'}
      </span>
    </Button>
  );
}
