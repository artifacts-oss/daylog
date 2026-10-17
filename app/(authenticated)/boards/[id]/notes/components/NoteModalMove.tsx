'use client';

import { Note } from '@/prisma/generated/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderArrowDownIcon } from '@heroicons/react/24/outline';
import { getBoards } from '@/app/(authenticated)/boards/lib/actions';
import { moveNote } from '../lib/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 100;

// Pages through every board so destinations beyond the first page stay selectable.
async function getAllBoards() {
  const all: { id: number; title: string }[] = [];
  for (;;) {
    const page = (await getBoards('title_asc', PAGE_SIZE, false, all.length)) ?? [];
    all.push(...page);
    if (page.length < PAGE_SIZE) return all;
  }
}

type NoteModalMoveType = {
  note: Note;
};

export default function NoteModalMove({ note }: NoteModalMoveType) {
  const t = useTranslations('NoteMove');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boards, setBoards] = useState<{ id: number; title: string }[]>([]);
  const [targetBoardId, setTargetBoardId] = useState<number | null>(null);

  async function onOpenChange(value: boolean) {
    setOpen(value);
    if (!value) return;
    setTargetBoardId(null);
    setBoards(await getAllBoards());
  }

  async function onMove() {
    if (targetBoardId === null) return;
    setSaving(true);
    try {
      if (await moveNote(note.id, targetBoardId)) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/5 rounded-full transition-all"
        >
          <FolderArrowDownIcon className="h-4 w-4" />
          <span className="sr-only">{t('move')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[24px] font-[700] tracking-tight text-foreground">
            {t('title')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 pb-5">
          <Label htmlFor="move-board">{t('boardLabel')}</Label>
          <Select
            value={targetBoardId === null ? '' : String(targetBoardId)}
            onValueChange={(v) => setTargetBoardId(Number(v))}
          >
            <SelectTrigger id="move-board">
              <SelectValue placeholder={t('placeholder')} />
            </SelectTrigger>
            <SelectContent>
              {boards.map((b) => (
                <SelectItem
                  key={b.id}
                  value={String(b.id)}
                  disabled={b.id === note.boardsId}
                >
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button type="button" disabled={saving || targetBoardId === null} onClick={onMove}>
            {saving ? t('moving') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
