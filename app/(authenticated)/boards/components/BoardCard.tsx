import { getSettings } from '@/app/(authenticated)/admin/lib/actions';
import { getBoard } from '@/app/(authenticated)/boards/lib/actions';
import { stringToColor } from '@/utils/color';
import { getImageUrlOrFile } from '@/utils/image';
import { truncateWord } from '@/utils/text';
import Link from 'next/link';
import TimeDiff from '@/components/TimeDiff';
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

  return (
    <div className="group relative aspect-[21/9] rounded-[20px] overflow-hidden border border-border bg-background hover:shadow-sm transition-all duration-500">
      {/* Clickable Background Layer */}
      <Link
        href={`/boards/${board.id}/notes`}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        <div
          className="w-full h-full transition-transform duration-700 group-hover:scale-110"
          style={
            board.imageUrl
              ? {
                  backgroundImage: `url(${getImageUrlOrFile(encodeURI(board.imageUrl))})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {
                  backgroundColor: stringToColor(board.title),
                }
          }
        >
          {/* Elegant Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </Link>

      {/* Content Layer */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-5 md:p-6 pointer-events-none">
        <div className="flex flex-col gap-3">
          <div className="space-y-0.5">
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
              {truncateWord(board.title, 40)}
            </h3>
            {board.description && (
              <p className="text-xs md:text-sm text-white/80 line-clamp-1 font-medium drop-shadow-md leading-snug">
                {board.description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              <TimeDiff updatedAt={board?.updatedAt} />
            </div>
            <div className="flex items-center gap-1 pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
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

      {/* Favorite Indicator */}
      {board.favorite && (
        <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.6)] z-20" />
      )}
    </div>
  );
}
