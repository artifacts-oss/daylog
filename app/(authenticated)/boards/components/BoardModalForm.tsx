'use client';

import {
  createBoard,
  deleteImage,
  saveImage,
  updateBoard,
} from '@/app/(authenticated)/boards/lib/actions';
import { Board, Prisma } from '@/prisma/generated/client';
import { resizeImage } from '@/utils/image';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
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
import ImageSection from '@/components/ImageSection';

type BoardModalFormType = {
  modalId: string;
  board?: Board | null;
  mode: 'update' | 'create';
  open?: boolean;
  isUnsplashAllowed?: boolean;
  trigger?: React.ReactNode;
};

export default function BoardModalForm({
  board,
  mode,
  open: externalOpen,
  isUnsplashAllowed = false,
  trigger,
}: BoardModalFormType) {
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
  } = useForm<Board>();

  useEffect(() => {
    if (externalOpen) {
      setOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('openNew');
      window.history.replaceState({}, '', url.toString());
    }
  }, [externalOpen]);

  const onSubmit: SubmitHandler<Board> = (data) => {
    setSubmiting(true);

    if (mode === 'create') {
      createBoardHandler(data);
    } else {
      updateBoardHandler(data);
    }

    setSubmiting(false);
    setOpen(false);
    reset();
    setImageFile(undefined);
    setImageUrl('');
  };

  async function uploadImage(boardId: number | null) {
    if ((!imageFile && !imageUrl) || !boardId) return;
    if (imageFile) {
      resizeImage(imageFile, 1920, 1080, async (resizedDataUrl) => {
        await saveImage(boardId, resizedDataUrl, board?.imageUrl);
        router.refresh();
      });
    } else {
      await saveImage(boardId, imageUrl, board?.imageUrl);
      router.refresh();
    }
  }

  const createBoardHandler = async (data: Board) => {
    const boardInput: Prisma.BoardCreateInput = {
      title: data.title,
      description: data.description,
      user: { connect: { id: 1 } },
    };

    const boardId = await createBoard(boardInput);
    await uploadImage(boardId);
    router.refresh();
  };

  const updateBoardHandler = async (data: Board) => {
    if (!board?.id) return;
    data.id = board?.id;
    await updateBoard(data);
    await uploadImage(data.id);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : mode === 'update' ? (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:text-white hover:bg-white/10"
          >
            <PencilSquareIcon className="h-5 w-5" />
            <span className="sr-only">Edit board</span>
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create board' : 'Update board'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <div className="space-y-2 relative pb-5">
            <Label htmlFor="title">
              Title <span className="text-accent-red">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Your board title"
              defaultValue={board?.title}
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
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Type any description"
              defaultValue={board?.description ?? ''}
              {...register('description')}
            />
          </div>
          <ImageSection
            currentImageUrl={board?.imageUrl}
            isUnsplashAllowed={isUnsplashAllowed}
            altText={`Preview image of ${board?.title || 'new board'}`}
            onImageFileChange={setImageFile}
            onImageUrlChange={setImageUrl}
            onDeleteImage={
              board?.id && board.imageUrl
                ? async () => {
                    await deleteImage(board.id, board.imageUrl);
                  }
                : undefined
            }
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
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
