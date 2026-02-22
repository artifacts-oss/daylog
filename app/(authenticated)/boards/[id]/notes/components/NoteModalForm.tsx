'use client';

import UnsplashImagesDropdown from '@/app/(authenticated)/boards/components/UnsplashImagesDropdown';
import { Note } from '@/prisma/generated/client';
import { getImageUrlOrFile, resizeImage } from '@/utils/image';
import { TrashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
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
          <DialogTitle>
            {mode === 'create' ? 'Create note' : 'Update note'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'update' && (
            <input
              type="hidden"
              defaultValue={note?.id}
              {...register('id', { required: true, valueAsNumber: true })}
            />
          )}
          {isUnsplashAllowed && (
            <UnsplashImagesDropdown imageSelected={(url) => setImageUrl(url)} />
          )}
          {mode === 'update' && note?.id && note.imageUrl && (
            <div className="space-y-2">
              <div className="rounded-lg overflow-hidden border">
                <Image
                  width="800"
                  height="0"
                  src={getImageUrlOrFile(note.imageUrl)}
                  alt={`Preview image of ${note.title}`}
                  className="w-auto h-auto"
                  priority={false}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={async () => {
                  await deleteImage(note.id, note.imageUrl);
                }}
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Remove image
              </Button>
            </div>
          )}
          <div>
            <Label htmlFor="image">
              Select image from your device{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0])}
              className="cursor-pointer"
            />
          </div>
          <div>
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Your note title"
              defaultValue={note?.title}
              {...register('title', { required: true })}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">Title is required</p>
            )}
          </div>
          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              rows={5}
              placeholder="Type any simple content"
              defaultValue={note?.content ?? ''}
              {...register('content')}
            />
          </div>
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
