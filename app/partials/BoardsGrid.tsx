'use client';

import { Board } from '@/prisma/generated/client';
import { stringToColor } from '@/utils/color';
import { getImageUrlOrFile } from '@/utils/image';
import { truncateWord } from '@/utils/text';
import { PlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface BoardsGridProps {
  boards: Board[];
  showFav?: boolean;
}

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0,
    },
  },
};

const itemVars = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.15 } },
};

export default function BoardsGrid({ boards, showFav = false }: BoardsGridProps) {
  const t = useTranslations('HomeTabs');

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {t('boardsTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {showFav ? t('boardsSubtitleFavorite') : t('boardsSubtitleRecent')}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="rounded-full px-4">
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
  );
}
