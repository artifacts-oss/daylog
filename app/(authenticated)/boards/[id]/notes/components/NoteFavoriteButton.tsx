'use client';

import { Note } from '@/prisma/generated/client';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { startTransition, useOptimistic } from 'react';
import { updateNote } from '../lib/actions';
import { Button } from '@/components/ui/button';

type NoteFavoriteButtonType = {
  note: Note;
};

export default function NoteFavoriteButton({ note }: NoteFavoriteButtonType) {
  const router = useRouter();

  // Flip the heart immediately; it falls back to the server value if the update fails.
  const [favorite, setOptimisticFavorite] = useOptimistic(note.favorite);

  const handleFavoriteClick = () => {
    startTransition(async () => {
      setOptimisticFavorite(!favorite);
      try {
        await updateNote({ ...note, favorite: !favorite });
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
      className="h-8 w-8 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
      onClick={handleFavoriteClick}
    >
      {favorite ? (
        <HeartSolidIcon
          data-testid="filled-heart"
          className="h-4 w-4 text-red-500 scale-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-150"
        />
      ) : (
        <HeartIcon className="h-4 w-4 transition-all duration-150" />
      )}
      <span className="sr-only">
        {favorite ? 'Remove from favorites' : 'Add to favorites'}
      </span>
    </Button>
  );
}
