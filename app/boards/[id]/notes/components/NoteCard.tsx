import { getSettings } from '@/app/admin/lib/actions';
import TimeDiff from '@/components/TimeDiff';
import { getImageUrlOrFile } from '@/utils/image';
import { removeMarkdownTags, truncateWord } from '@/utils/text';
import Image from 'next/image';
import Link from 'next/link';
import { getNote } from '../lib/actions';
import NoteFavoriteButton from './NoteFavoriteButton';
import NoteModalDelete from './NoteModalDelete';
import NoteModalForm from './NoteModalForm';
import { Card, CardContent } from '@/components/ui/card';

type NoteCardType = {
  noteId: number;
};

export default async function NoteCard({ noteId }: NoteCardType) {
  const note = await getNote(noteId);
  if (!note) {
    return null;
  }

  const settings = await getSettings();

  return (
    <Card className="flex flex-col overflow-hidden">
      {note?.imageUrl && (
        <Link
          className="block aspect-[21/9]"
          href={`/boards/${note.boardsId}/notes/${note.id}`}
        >
          <Image
            width={800}
            height={600}
            className="w-full h-full object-cover"
            src={getImageUrlOrFile(note.imageUrl)}
            alt={`Image of ${note.title}`}
            priority={false}
          />
        </Link>
      )}
      <CardContent className="flex-1 flex flex-col">
        <h3 className="font-semibold">
          <Link
            href={`/boards/${note.boardsId}/notes/${note.id}`}
            className="hover:underline"
          >
            {truncateWord(note.title, 35)}
          </Link>
        </h3>
        <p
          className={`text-sm text-muted-foreground flex-1 ${
            note.imageUrl ? 'line-clamp-2' : 'line-clamp-8'
          }`}
        >
          {removeMarkdownTags(note.content ?? '')}
        </p>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            <TimeDiff updatedAt={note?.updatedAt} />
          </div>
          <div className="flex items-center gap-1">
            <NoteModalForm
              note={note}
              boardId={note.boardsId!}
              modalId={`edit-note-modal-${note.id}`}
              mode="update"
              isUnsplashAllowed={settings?.allowUnsplash}
            />
            <NoteModalDelete note={note} />
            <NoteFavoriteButton note={note} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
