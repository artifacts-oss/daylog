'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PaintBrushIcon } from '@heroicons/react/24/outline';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ImageSection from '@/components/ImageSection';
import { deleteImage } from '../lib/actions';
import { CoverError, uploadCover } from '../lib/uploadCover';

type NoteCoverDialogProps = {
  noteId: number;
  noteTitle: string;
  currentImageUrl?: string | null;
  isUnsplashAllowed?: boolean;
};

// Cover-only editor for the note page: the full NoteModalForm would also submit
// the content textarea and overwrite what is being typed in the live editor.
export default function NoteCoverDialog({
  noteId,
  noteTitle,
  currentImageUrl,
  isUnsplashAllowed = false,
}: NoteCoverDialogProps) {
  const t = useTranslations('NoteModal');
  const tImage = useTranslations('ImageSection');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<CoverError | null>(null);
  const [imageFile, setImageFile] = useState<File>();
  const [imageUrl, setImageUrl] = useState('');

  const save = async () => {
    const image = imageFile ?? imageUrl;
    if (!image) return;
    setSaving(true);
    setError(null);
    const failure = await uploadCover(noteId, image);
    setSaving(false);
    // Keep the dialog open on failure so the user can retry.
    if (failure) {
      setError(failure);
      return;
    }
    setOpen(false);
    setImageFile(undefined);
    setImageUrl('');
    router.refresh();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
          <PaintBrushIcon className="h-4 w-4" />
          <span className="sr-only">{tImage('coverImage')}</span>
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-[24px] font-[700] tracking-tight text-foreground">
            {tImage('coverImage')}
          </DialogTitle>
        </DialogHeader>
        <ImageSection
          currentImageUrl={currentImageUrl}
          isUnsplashAllowed={isUnsplashAllowed}
          altText={t('imageAlt', { title: noteTitle })}
          onImageFileChange={setImageFile}
          onImageUrlChange={setImageUrl}
          onDeleteImage={
            currentImageUrl
              ? async () => {
                  await deleteImage(noteId);
                  router.refresh();
                }
              : undefined
          }
        />
        {error && (
          <p role="alert" className="text-[12px] text-accent-red">
            {t(`imageErrors.${error}`)}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t('close')}
          </Button>
          <Button type="button" disabled={saving || (!imageFile && !imageUrl)} onClick={save}>
            {saving ? t('saving') : t('update')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
