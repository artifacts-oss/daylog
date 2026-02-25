'use client';

import TimeDiff from '@/components/TimeDiff';
import { getImageUrlOrFile } from '@/utils/image';
import { removeMarkdownTags } from '@/utils/text';
import Image from 'next/image';
import Link from 'next/link';
import NoteFavoriteButton from './NoteFavoriteButton';
import NoteModalDelete from './NoteModalDelete';
import NoteModalForm from './NoteModalForm';
import { NoteWithBoards } from '../lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface NoteCardProps {
  note: NoteWithBoards;
  settings?: { allowUnsplash?: boolean };
}

export default function NoteCard({ note, settings }: NoteCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="group relative flex flex-col rounded-[20px] border border-border bg-background hover:shadow-sm hover:-translate-y-1 transition-all duration-500 overflow-hidden"
    >
      <Link
        href={`/boards/${note.boardsId}/notes/${note.id}`}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">View note</span>
      </Link>

      {note.imageUrl && (
        <div className="block relative aspect-video overflow-hidden">
          <Image
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            src={getImageUrlOrFile(note.imageUrl)}
            alt={note.title}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      )}

      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="block group-hover:text-primary transition-colors">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight leading-tight line-clamp-2">
              {note.title}
            </h3>
          </div>
          <p
            className={cn(
              'text-[16px] text-muted-foreground font-[400] leading-relaxed',
              note.imageUrl ? 'line-clamp-3' : 'line-clamp-6',
            )}
          >
            {removeMarkdownTags(note.content || '')}
          </p>
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-border relative z-20">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-[500] uppercase tracking-wider text-muted-foreground/70">
              <TimeDiff updatedAt={note?.updatedAt} />
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-2 group-hover:translate-x-0 transition-transform">
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
      </div>

      {note.favorite && (
        <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.6)]" />
      )}
    </motion.div>
  );
}
