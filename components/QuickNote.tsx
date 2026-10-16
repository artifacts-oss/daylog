'use client';

import { useEffect, useRef } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import NoteModalForm from '@/app/(authenticated)/boards/[id]/notes/components/NoteModalForm';

type QuickNoteProps = {
  boards: { id: number; title: string }[];
};

export default function QuickNote({ boards }: QuickNoteProps) {
  const t = useTranslations('NoteModal');
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // e.code: on macOS Option+N yields a dead key, not 'n'.
      if (!e.altKey || e.code !== 'KeyN') return;
      const el = e.target;
      // Don't hijack typing (e.g. Option+N → ñ) inside editable fields.
      if (
        el instanceof HTMLElement &&
        (el.isContentEditable || el.closest('input, textarea, select'))
      )
        return;
      e.preventDefault();
      triggerRef.current?.click();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (boards.length === 0) return null;

  return (
    <NoteModalForm
      modalId="quickNote"
      mode="create"
      boardId={boards[0].id}
      boards={boards}
      trigger={
        <Button
          ref={triggerRef}
          size="icon"
          title={`${t('quickNote')} (Alt+N)`}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/20 md:hidden"
        >
          <PlusIcon className="h-6 w-6" />
          <span className="sr-only">{t('quickNote')}</span>
        </Button>
      }
    />
  );
}
