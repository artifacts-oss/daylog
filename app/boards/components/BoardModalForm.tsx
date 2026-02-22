'use client';

import {
  createBoard,
  deleteImage,
  saveImage,
  updateBoard,
} from '@/app/boards/lib/actions';
import { Board, Prisma } from '@/prisma/generated/client';
import { getImageUrlOrFile, resizeImage } from '@/utils/image';
import { TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import UnsplashImagesDropdown from './UnsplashImagesDropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BoardModalFormType = {
  modalId: string;
  board?: Board | null;
  mode: 'update' | 'create';
  open?: boolean;
  isUnsplashAllowed?: boolean;
};

export default function BoardModalForm({
  board,
  mode,
  open: externalOpen,
  isUnsplashAllowed = false,
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
    <>
      {mode === 'create' ? (
        <Button onClick={() => setOpen(true)} data-testid="open-create-modal">
          Open
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white hover:text-white hover:bg-white/10"
          onClick={() => setOpen(true)}
        >
          <PencilSquareIcon className="h-5 w-5" />
          <span className="sr-only">Edit board</span>
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Create board' : 'Update board'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isUnsplashAllowed && (
              <div>
                <UnsplashImagesDropdown
                  imageSelected={(url) => setImageUrl(url)}
                />
              </div>
            )}
            {mode === 'update' && board?.id && board.imageUrl && (
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden border">
                  <Image
                    width="800"
                    height="0"
                    src={getImageUrlOrFile(board.imageUrl)}
                    alt={`Preview image of ${board.title}`}
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
                    await deleteImage(board.id, board.imageUrl);
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
                placeholder="Your board title"
                defaultValue={board?.title}
                {...register('title', { required: true })}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">Title is required</p>
              )}
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Type any description"
                defaultValue={board?.description ?? ''}
                {...register('description')}
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
    </>
  );
}

