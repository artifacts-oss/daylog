'use client';

import Loader from '@/components/Loader';
import TimeDiff from '@/components/TimeDiff';
import { Board } from '@/prisma/generated/client';
import { stringToColor } from '@/utils/color';
import { getImageUrlOrFile } from '@/utils/image';
import { removeMarkdownTags, truncateWord } from '@/utils/text';
import { FaceSmileIcon, PlusIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getNotes } from '../boards/[id]/notes/lib/actions';
import { getBoards } from '../boards/lib/actions';
import { NoteWithBoards } from '../boards/[id]/notes/lib/types';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function HomeTabs({
  showFav: showFav = false,
}: {
  showFav?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [notes, setNotes] = useState<NoteWithBoards[] | null>([]);
  const [boards, setBoards] = useState<Board[] | null>([]);

  function setBackgroundImage(str: string): string {
    const color = stringToColor(str);
    return color;
  }

  const getBoardNotes = async () => {
    setLoadingNotes(true);
    const result = await getNotes('created_desc', 8);
    setNotes(result);
    setLoadingNotes(false);
  };

  useEffect(() => {
    const loadBoards = async () => {
      const result = await getBoards('created_desc');
      setLoading(false);
      if (result != null && result.length > 0) {
        let recentBoards = result;
        if (!showFav) {
          recentBoards = result.sort((a, b) => {
            return +b.favorite - +a.favorite;
          });
        } else {
          recentBoards = result.filter((board) => board.favorite);
        }
        setBoards(recentBoards);
        if (recentBoards.length > 0) getBoardNotes();
      } else {
        setBoards([]);
        setNotes([]);
      }
    };

    setBoards([]);
    setNotes([]);
    setLoading(true);

    loadBoards();
    setIsClient(true);
  }, [showFav]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Boards</h2>
        <Button variant="ghost" asChild>
          <Link href="/boards">View all</Link>
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader caption="Loading boards..." />
        </div>
      ) : (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ ease: 'easeIn', duration: 0.5 }}
          className="flex gap-4 overflow-x-auto pb-2"
        >
          {isClient &&
            boards?.map((board) => (
              <Link
                key={board.id}
                href={`/boards/${board.id}/notes`}
                className="flex-shrink-0 min-w-[180px] h-20 rounded-lg shadow-sm overflow-hidden flex items-end p-3"
                style={
                  board.imageUrl
                    ? {
                        backgroundImage: `linear-gradient(0deg, rgba(0, 0, 0, 0.5), rgba(20, 20, 20, 0.3)), url(${getImageUrlOrFile(
                          `${encodeURI(board.imageUrl)}`
                        )})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : {
                        backgroundColor: setBackgroundImage(board.title),
                      }
                }
              >
                <span
                  className="font-semibold text-white"
                  style={{ textShadow: '1px 1px 3px black' }}
                >
                  {truncateWord(board.title)}
                </span>
              </Link>
            ))}
          <Link
            href="/boards?openNew=true"
            className="flex-shrink-0 min-w-[180px] h-20 rounded-lg border-2 border-dashed border-muted-foreground flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="text-sm">New board</span>
          </Link>
        </motion.div>
      )}

      <h2 className="text-xl font-semibold">Recent Notes</h2>
      {loadingNotes ? (
        <div className="flex justify-center py-8">
          <Loader caption="Loading notes..." />
        </div>
      ) : notes && notes.length > 0 ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: 'easeOut', duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {notes.map(
            (note) =>
              note.boardsId && (
                <div
                  key={note.id}
                  className="rounded-lg border bg-card overflow-hidden min-h-[200px] max-h-[200px] flex flex-col"
                >
                  {note.imageUrl && (
                    <Link
                      href={`/boards/${note.boardsId}/notes/${note.id}`}
                      className="block aspect-[21/9]"
                    >
                      <Image
                        width={320}
                        height={180}
                        className="w-full h-full object-cover"
                        src={getImageUrlOrFile(note.imageUrl)}
                        alt={truncateWord(note.title, 20)}
                        priority={false}
                      />
                    </Link>
                  )}
                  <div className="flex-1 flex flex-col justify-between p-3">
                    <div className="space-y-1">
                      <Link
                        href={`/boards/${note.boardsId}/notes/${note.id}`}
                        className="font-semibold line-clamp-1 hover:underline"
                      >
                        {note.title}
                      </Link>
                      {!note.imageUrl && (
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {removeMarkdownTags(note.content || '')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <TimeDiff updatedAt={note?.updatedAt} />
                      <Link href={`/boards/${note.boardsId}/notes`}>
                        <span
                          className="px-2 py-0.5 rounded text-white font-medium text-xs"
                          style={{
                            backgroundColor: stringToColor(
                              note.boards?.title || ''
                            ),
                            textShadow: '1px 1px 3px black',
                          }}
                        >
                          {truncateWord(note.boards?.title || '', 10)}
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              )
          )}
        </motion.div>
      ) : (
        <EmptyNotes showFav={showFav} />
      )}
    </div>
  );
}

function EmptyNotes({ showFav }: { showFav: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <FaceSmileIcon className="h-8 w-8 mb-2" />
      <p>
        You don&apos;t have {showFav ? 'favorite ' : ''}notes yet...
      </p>
      <Link href="/boards" className="text-primary hover:underline mt-2">
        Go to your boards and create one.
      </Link>
    </div>
  );
}
