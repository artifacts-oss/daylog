'use client';

import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { ReactNode } from 'react';
import { Note } from '@/prisma/generated/client';
import { useRouter } from 'next/navigation';
import { deleteNote } from '../lib/actions';

type NoteModalDeleteType = {
  note: Note;
  redirectTo?: string;
  trigger?: ReactNode;
};

export default function NoteModalDelete({ note, redirectTo, trigger }: NoteModalDeleteType) {
  const router = useRouter();

  return (
    <ConfirmDeleteModal
      namespace="NoteDelete"
      entityTitle={note.title}
      trigger={trigger}
      onDelete={() => deleteNote(note)}
      onSuccess={redirectTo ? () => router.push(redirectTo) : undefined}
    />
  );
}
