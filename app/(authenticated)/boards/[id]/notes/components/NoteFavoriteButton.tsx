'use client';

import { Note } from '@/prisma/generated/client';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { updateNote } from '../lib/actions';
import { Button } from '@/components/ui/button';

type NoteFavoriteButtonType = {
  note: Note;
};

export default function NoteFavoriteButton({ note }: NoteFavoriteButtonType) {
  const router = useRouter();

  const handleFavoriteClick = async () => {
    await updateNote({ ...note, favorite: !note.favorite });
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300"
      onClick={handleFavoriteClick}
    >
      {note.favorite ? (
        <HeartSolidIcon
          data-testid="filled-heart"
          className="h-4 w-4 text-red-500 scale-125 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] transition-all duration-300"
        />
      ) : (
        <HeartIcon className="h-4 w-4 transition-all duration-300" />
      )}
      <span className="sr-only">
        {note.favorite ? 'Remove from favorites' : 'Add to favorites'}
      </span>
    </Button>
  );
}
