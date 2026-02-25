'use client';

import { Note } from '@/prisma/generated/client';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteNote } from '../lib/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertOctagon } from 'lucide-react';

type NoteModalDeleteType = {
  note: Note;
};

export default function NoteModalDelete({ note }: NoteModalDeleteType) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDeleteClick = async () => {
    setDeleting(true);
    await deleteNote(note);
    router.refresh();
    setDeleting(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <TrashIcon className="h-4 w-4" />
          <span className="sr-only">Delete note</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-10 max-w-[480px]">
        <DialogHeader className="mb-6">
          <Label className="text-destructive">Security Verification</Label>
          <DialogTitle className="flex items-center gap-2">
            Delete Note
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          <p className="text-sm text-muted-foreground leading-relaxed antialiased">
            Are you sure you want to delete{' '}
            <strong className="text-destructive">{note.title}</strong>? This
            action is permanent and cannot be undone.
          </p>

          <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-destructive/20">
            <p className="text-[12px] text-destructive font-medium leading-normal flex gap-2">
              <AlertOctagon className="h-4 w-4 flex-shrink-0" />
              Warning: Deleting this note will permanently remove its content.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-8 gap-3 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            className="rounded-[12px] text-muted-foreground font-bold hover:bg-secondary/10"
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteClick}
            disabled={deleting}
            className="font-bold px-8 shadow-none"
          >
            {deleting ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
