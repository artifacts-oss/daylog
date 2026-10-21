'use client';

import { Note } from '@/prisma/generated/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { createNote, deleteImage, updateNote } from '../lib/actions';
import { CoverError, uploadCover } from '../lib/uploadCover';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import ImageSection from '@/components/ImageSection';
import { useTranslations } from 'next-intl';

type NoteModalFormType = {
  modalId: string;
  boardId: number;
  note?: Note | null;
  open?: boolean;
  mode: 'update' | 'create';
  isUnsplashAllowed?: boolean;
  trigger?: React.ReactNode;
  // When set, the user picks the target board inside the modal (quick capture).
  boards?: { id: number; title: string }[];
};

export default function NoteModalForm({
  boardId,
  note,
  open: externalOpen,
  mode,
  isUnsplashAllowed = false,
  trigger,
  boards,
}: NoteModalFormType) {
  const t = useTranslations('NoteModal');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submiting, setSubmiting] = useState(false);
  const [imageFile, setImageFile] = useState<File>();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [targetBoardId, setTargetBoardId] = useState(boardId);
  const [imageError, setImageError] = useState<CoverError | null>(null);
  // Set once the note exists, so retrying a failed cover upload doesn't create a duplicate.
  const [createdNoteId, setCreatedNoteId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<Note>();

  const onSubmit: SubmitHandler<Note> = async (data) => {
    setSubmiting(true);
    setImageError(null);

    try {
      // On failure keep the modal and draft open so the user can retry.
      const done =
        mode === 'create'
          ? await createNoteHandler(data, targetBoardId)
          : await updateNoteHandler(data);
      if (!done) return;
      setOpen(false);
      setImageFile(undefined);
      setImageUrl('');
      reset();
    } finally {
      setSubmiting(false);
    }
  };

  // Returns false, showing why, when the picked cover couldn't be saved.
  async function uploadImage(noteId: number): Promise<boolean> {
    const image = imageFile ?? imageUrl;
    if (!image) return true;
    const failure = await uploadCover(noteId, image);
    setImageError(failure);
    return !failure;
  }

  const createNoteHandler = async (
    data: Note,
    boardId: number,
  ): Promise<boolean> => {
    const noteId = createdNoteId ?? (await createNote(data, boardId));
    if (!noteId) return false;
    setCreatedNoteId(noteId);
    if (!(await uploadImage(noteId))) return false;
    setCreatedNoteId(null);
    // Land in the editor so the user can keep writing right away.
    router.push(`/boards/${boardId}/notes/${noteId}`);
    return true;
  };

  const updateNoteHandler = async (data: Note): Promise<boolean> => {
    await updateNote(data);
    const uploaded = await uploadImage(data.id);
    router.refresh();
    return uploaded;
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    setImageError(null);
    // Closing after a failed cover upload: the note was created, so show it in the list.
    if (!next && createdNoteId) {
      setCreatedNoteId(null);
      reset();
      router.refresh();
    }
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <span className="sr-only">{t('edit')}</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[24px] font-[700] tracking-tight text-foreground">
            {mode === 'create' ? t('createTitle') : t('updateTitle')}
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
          {boards && (
            <div className="space-y-2 relative pb-5">
              <Label htmlFor="board">{t('boardLabel')}</Label>
              <Select
                value={String(targetBoardId)}
                onValueChange={(v) => setTargetBoardId(Number(v))}
              >
                <SelectTrigger id="board">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2 relative pb-5">
            <Label htmlFor="title">
              {t('titleLabel')} <span className="text-accent-red">*</span>
            </Label>
            <Input
              id="title"
              placeholder={t('titlePlaceholder')}
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
                {t('titleRequired')}
              </p>
            )}
          </div>
          <div className="space-y-2 relative pb-5">
            <Label htmlFor="content">{t('contentLabel')}</Label>
            <Textarea
              id="content"
              rows={5}
              placeholder={t('contentPlaceholder')}
              defaultValue={note?.content ?? ''}
              {...register('content')}
            />
          </div>
          <ImageSection
            currentImageUrl={note?.imageUrl}
            isUnsplashAllowed={isUnsplashAllowed}
            altText={t('imageAlt', { title: note?.title || t('createTitle') })}
            onImageFileChange={setImageFile}
            onImageUrlChange={setImageUrl}
            onDeleteImage={
              note?.id && note.imageUrl
                ? async () => {
                    await deleteImage(note.id);
                    router.refresh();
                  }
                : undefined
            }
          />
          {imageError && (
            <p role="alert" className="text-[12px] text-accent-red">
              {t(`imageErrors.${imageError}`)}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('close')}
            </Button>
            <Button type="submit" disabled={submiting}>
              {submiting ? t('saving') : mode === 'create' ? t('create') : t('update')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
