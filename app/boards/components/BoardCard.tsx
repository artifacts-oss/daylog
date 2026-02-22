import { getSettings } from '@/app/admin/lib/actions';
import { getBoard } from '@/app/boards/lib/actions';
import { stringToColor } from '@/utils/color';
import { getImageUrlOrFile } from '@/utils/image';
import { truncateWord } from '@/utils/text';
import Image from 'next/image';
import Link from 'next/link';
import TimeDiff from '../../../components/TimeDiff';
import BoardFavoriteButton from './BoardFavoriteButton';
import BoardModalDelete from './BoardModalDelete';
import BoardModalForm from './BoardModalForm';

export type BoardCardType = {
  boardId: number;
};

export default async function BoardCard({ boardId }: BoardCardType) {
  const board = await getBoard(boardId);
  if (!board) {
    return null;
  }

  const settings = await getSettings();

  function setBackgroundImage(str: string): string {
    const color = stringToColor(str);
    return color;
  }

  return (
    <div className="group relative rounded-lg overflow-hidden border bg-card">
      {board?.imageUrl ? (
        <Link href={`/boards/${board.id}/notes`} className="block aspect-[21/9]">
          <Image
            width={800}
            height={600}
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
            }}
            className="w-full h-full"
            src={getImageUrlOrFile(board.imageUrl)}
            alt={`Image of ${board.title}`}
            priority={false}
          />
        </Link>
      ) : (
        <Link
          data-testid={`board-${board.id}`}
          href={`/boards/${board.id}/notes`}
          className="block aspect-[21/9]"
          style={{ backgroundColor: setBackgroundImage(board.title) }}
        />
      )}
      <div
        className="absolute inset-0 flex flex-col justify-end p-4"
        style={{
          backgroundImage:
            'linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(20, 20, 20, 0.3))',
        }}
      >
        <h3 className="text-lg font-semibold text-white">
          {truncateWord(board.title, 35)}
        </h3>
        <p className="text-sm text-white/80 line-clamp-2">
          {board.description}
        </p>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-white/70">
            <TimeDiff updatedAt={board?.updatedAt} />
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <BoardModalForm
              board={board}
              modalId={`edit-board-modal-${board.id}`}
              mode="update"
              isUnsplashAllowed={settings?.allowUnsplash}
            />
            <BoardModalDelete board={board} />
            <BoardFavoriteButton board={board} />
          </div>
        </div>
      </div>
    </div>
  );
}
