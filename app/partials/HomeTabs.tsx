'use client';

import TimeDiff from '@/components/TimeDiff';
import { Board } from '@/prisma/generated/client';
import { stringToColor } from '@/utils/color';
import { getImageUrlOrFile } from '@/utils/image';
import { removeMarkdownTags, truncateWord } from '@/utils/text';
import { FaceSmileIcon, PlusIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { NoteWithBoards } from '../(authenticated)/boards/[id]/notes/lib/types';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface HomeTabsProps {
  boards: Board[];
  notes: NoteWithBoards[];
  showFav?: boolean;
}

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVars = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function HomeTabs({
  boards,
  notes,
  showFav = false,
}: HomeTabsProps) {
  const t = useTranslations('HomeTabs');

  return (
    <div className="space-y-12 py-4">
      {/* Boards Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t('boardsTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {showFav
                ? t('boardsSubtitleFavorite')
                : t('boardsSubtitleRecent')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="rounded-full px-4"
          >
            <Link href="/boards">{t('exploreAll')}</Link>
          </Button>
        </div>

        <motion.div
          key={showFav ? 'fav' : 'recent'}
          variants={containerVars}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {boards.map((board) => (
            <motion.div key={board.id} variants={itemVars}>
              <Link
                href={`/boards/${board.id}/notes`}
                className="group relative flex flex-col aspect-[2.5/1] rounded-2xl overflow-hidden border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div
                  className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity"
                  style={
                    board.imageUrl
                      ? {
                          backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent), url(${getImageUrlOrFile(
                            `${encodeURI(board.imageUrl)}`,
                          )})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : {
                          backgroundColor: stringToColor(board.title),
                        }
                  }
                />
                <div className="relative mt-auto p-4">
                  <span className="font-bold text-white text-sm md:text-base leading-tight drop-shadow-md">
                    {truncateWord(board.title, 30)}
                  </span>
                </div>
                {board.favorite && (
                  <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
                )}
              </Link>
            </motion.div>
          ))}

          <motion.div variants={itemVars}>
            <Link
              href="/boards?openNew=true"
              className="flex flex-col items-center justify-center aspect-[2.5/1] rounded-2xl border-2 border-dashed border-muted transition-all duration-300 hover:border-primary hover:bg-primary/5 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                  <PlusIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-primary">
                  {t('createBoard')}
                </span>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Notes Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {t('notesTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {showFav ? t('notesSubtitleFavorite') : t('notesSubtitleRecent')}
            </p>
          </div>
        </div>

        {notes && notes.length > 0 ? (
          <motion.div
            key={showFav ? 'fav-notes' : 'recent-notes'}
            variants={containerVars}
            initial="hidden"
            animate="show"
            className="masonry-container space-y-4"
          >
            {notes.map((note) => (
              <motion.div
                key={note.id}
                variants={itemVars}
                className="masonry-item"
              >
                <div className="group relative rounded-2xl border bg-card hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden flex flex-col h-full">
                  {/* Clickable Background Layer */}
                  <Link
                    href={`/boards/${note.boardsId}/notes/${note.id}`}
                    className="absolute inset-0 z-0"
                  />

                  <div className="relative z-10 flex flex-col h-full pointer-events-none">
                    {note.imageUrl && (
                      <div className="relative aspect-video overflow-hidden">
                        <Image
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          src={getImageUrlOrFile(note.imageUrl)}
                          alt={note.title}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col space-y-3">
                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {note.title}
                      </h3>

                      {!note.imageUrl && (
                        <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                          {removeMarkdownTags(note.content || '')}
                        </p>
                      )}

                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-muted">
                        <div className="flex items-center gap-2 pointer-events-auto relative z-20">
                          <Link href={`/boards/${note.boardsId}/notes`}>
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-80"
                              style={{
                                backgroundColor: stringToColor(
                                  note.boards?.title || '',
                                ),
                                boxShadow: `0 2px 8px ${stringToColor(note.boards?.title || '')}40`,
                              }}
                            >
                              {truncateWord(note.boards?.title || '', 12)}
                            </span>
                          </Link>
                        </div>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          <TimeDiff updatedAt={note?.updatedAt} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyNotes showFav={showFav} />
        )}
      </section>
    </div>
  );
}

function EmptyNotes({ showFav }: { showFav: boolean }) {
  const t = useTranslations('HomeTabs');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-muted"
    >
      <div className="p-4 rounded-full bg-background mb-4 shadow-sm">
        <FaceSmileIcon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-bold mb-2">{t('emptyTitle')}</h3>
      <p className="text-muted-foreground max-w-sm mx-auto mb-6">
        {showFav
          ? t('emptyDescriptionFavorite')
          : t('emptyDescriptionRecent')}
      </p>
      <Button asChild className="rounded-full px-8">
        <Link href="/boards">{t('getStarted')}</Link>
      </Button>
    </motion.div>
  );
}
