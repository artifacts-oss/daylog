'use client';

import { Note } from '@/prisma/generated/client';
import { resizeImage } from '@/utils/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { createNote, deleteImage, saveImage, updateNote } from '../lib/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import ImageSection from '@/components/ImageSection';

type NoteModalFormType = {
  modalId: string;
  boardId: number;
  note?: Note | null;
  open?: boolean;
  mode: 'update' | 'create';
  isUnsplashAllowed?: boolean;
  trigger?: React.ReactNode;
};

export default function NoteModalForm({
  boardId,
  note,
  open: externalOpen,
  mode,
  isUnsplashAllowed = false,
  trigger,
}: NoteModalFormType) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submiting, setSubmiting] = useState(false);
  const [imageFile, setImageFile] = useState<File>();
  const [imageUrl, setImageUrl] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Note>();

  const onSubmit: SubmitHandler<Note> = (data) => {
    setSubmiting(true);

    if (mode === 'create') {
      createNoteHandler(data, boardId);
    } else {
      updateNoteHandler(data);
    }

    setSubmiting(false);
    setOpen(false);
    setImageFile(undefined);
    setImageUrl('');
    reset();
  };

  async function uploadImage(noteId: number | null) {
    if ((!imageFile && !imageUrl) || !noteId) return;
    if (imageFile) {
      resizeImage(imageFile, 1920, 1080, async (resizedDataUrl) => {
        await saveImage(noteId, resizedDataUrl, note?.imageUrl);
        router.refresh();
      });
    } else {
      await saveImage(noteId, imageUrl, note?.imageUrl);
      router.refresh();
    }
  }

  const createNoteHandler = async (data: Note, boardId: number) => {
    const noteId = await createNote(data, boardId);
    await uploadImage(noteId);
    router.refresh();
  };

  const updateNoteHandler = async (data: Note) => {
    await updateNote(data);
    await uploadImage(data.id);
    router.refresh();
  };

  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('openNew');
      window.history.replaceState({}, '', url.toString());
    }
  }, [externalOpen]);

  useEffect(() => {
    if (note) {
      reset(note);
    } else {
      reset({ title: '', content: '' } as Note);
    }
  }, [note, reset]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : mode === 'update' ? (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/5 rounded-full transition-all"
          >
            <PencilSquareIcon className="h-4 w-4" />
            <span className="sr-only">Edit note</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[24px] font-[700] tracking-tight text-foreground">
            {mode === 'create' ? 'Create note' : 'Update note'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          {mode === 'update' && (
            <input
              type="hidden"
              defaultValue={note?.id}
              {...register('id', { required: true, valueAsNumber: true })}
            />
          )}
          <div className="space-y-2 relative pb-5">
            <Label htmlFor="title">
              Title <span className="text-accent-red">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Your note title"
              defaultValue={note?.title}
              {...register('title', { required: true })}
              className={
                errors.title
                  ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive'
                  : ''
              }
            />
            {errors.title && (
              <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                Title is required
              </p>
            )}
          </div>
          <div className="space-y-2 relative pb-5">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              rows={5}
              placeholder="Type any simple content"
              defaultValue={note?.content ?? ''}
              {...register('content')}
            />
          </div>
          <ImageSection
            currentImageUrl={note?.imageUrl}
            isUnsplashAllowed={isUnsplashAllowed}
            altText={`Preview image of ${note?.title || 'new note'}`}
            onImageFileChange={setImageFile}
            onImageUrlChange={setImageUrl}
            onDeleteImage={
              note?.id && note.imageUrl
                ? async () => {
                    await deleteImage(note.id, note.imageUrl);
                  }
                : undefined
            }
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={submiting}>
              {submiting
                ? 'Saving...'
                : mode === 'create'
                  ? 'Create'
                  : 'Update'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
