'use client';

import { Note, Picture } from '@/prisma/generated/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  savePicture,
  updateNote,
  getPictures,
  deletePicture,
  deleteImage,
} from '../../lib/actions';
import Image from 'next/image';
import { getImageUrlOrFile, resizeImage } from '@/utils/image';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { useTheme } from 'next-themes';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type NoteEditorType = {
  note: Note;
};

export default function Editor({ note }: NoteEditorType) {
  const router = useRouter();

  const [markdown, setMarkdown] = useState(note.content ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [pictures, setPictures] = useState<Picture[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { theme } = useTheme();

  const loadPictures = useCallback(async () => {
    const pictures = (await getPictures(note.id)) ?? [];
    setPictures(pictures);
  }, [note.id]);

  useEffect(() => {
    window.addEventListener('storage', (event) => {
      if (event.key === `note-${note.id}`) {
        const storedContent = localStorage.getItem(`note-${note.id}`);
        if (storedContent !== null) {
          setMarkdown(storedContent);
        }
      }
    });
    loadPictures();
  }, [note.id, loadPictures]);

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const updateNoteHandler = useCallback(
    async (content: string) => {
      if (!note) return;
      note.content = content;
      if (note) await updateNote(note);
    },
    [note]
  );

  const debounceSave = useCallback(
    (content: string, callback: () => void) => {
      if (debounceTimer) clearTimeout(debounceTimer);

      const timeout = setTimeout(() => {
        updateNoteHandler(content);
        callback();
      }, 1000);

      setDebounceTimer(timeout);
    },
    [updateNoteHandler, debounceTimer]
  );

  const saveContent = useCallback(
    (content: string) => {
      localStorage.setItem(`note-${note.id}`, content);
      setIsSaving(true);
      debounceSave(content, () => {
        setIsSaving(false);
      });
    },
    [note.id, debounceSave]
  );

  useEffect(() => {
    if (markdown !== localStorage.getItem(`note-${note.id}`)) {
      saveContent(markdown);
    }
  }, [markdown, note.id, saveContent]);

  const handlePlaceImage = (imageUrl: string) => {
    const textarea = document.getElementsByClassName(
      'w-md-editor-text-input'
    )[0] as HTMLTextAreaElement;
    const leftContent = markdown.substring(0, textarea.selectionStart);
    const rightContent = markdown.substring(textarea.selectionStart);
    const newContent =
      leftContent + '![alt text](' + imageUrl + ')' + rightContent;

    setMarkdown(newContent);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      resizeImage(file, 1920, 1080, async (resizedDataUrl) => {
        const imageUrl = await savePicture(note.id, resizedDataUrl);
        if (!imageUrl) return;
        await loadPictures();
      });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleDeletePicture = async (pictureId: number) => {
    try {
      await deletePicture(note.id, pictureId);
      await loadPictures();
    } catch (error) {
      console.error('Error deleting picture:', error);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="p-0 border-0 h-auto relative">
          <div data-color-mode={theme}>
            <MDEditor
              data-testid="editor"
              height={480}
              minHeight={480}
              value={markdown}
              onChange={(value) => setMarkdown(value ?? '')}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
            />
            {isSaving && (
              <div
                className="bg-primary"
                aria-label="Saving changes..."
                title="Saving changes..."
                style={{
                  position: 'absolute',
                  top: -5,
                  left: -5,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  zIndex: 9999,
                  animation: 'pulse 2s infinite',
                  cursor: 'pointer',
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Pictures</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click a picture to place it in the editor at the cursor position.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {note &&
              note.imageUrl &&
              PicturePreview({
                imageUrl: note.imageUrl,
                onClick: () => {
                  handlePlaceImage(getImageUrlOrFile(note.imageUrl!));
                },
                onDelete: async () => {
                  await deleteImage(note.id, note.imageUrl);
                  router.refresh();
                },
              })}
            {pictures.map((picture, key) => (
              <PicturePreview
                key={key}
                pictureId={picture.id}
                onDelete={() => handleDeletePicture(picture.id)}
                imageUrl={picture.imageUrl}
                onClick={() => {
                  handlePlaceImage(getImageUrlOrFile(picture.imageUrl));
                }}
              />
            ))}
          </div>

          {pictures.length === 0 && note.imageUrl === null && (
            <p className="text-muted-foreground">No pictures</p>
          )}
        </CardContent>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <PhotoIcon className="h-4 w-4 mr-2" />
            Add picture
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const PicturePreview = ({
  pictureId,
  imageUrl,
  onClick,
  onDelete,
}: {
  pictureId?: number | null;
  imageUrl: string;
  onClick: () => void;
  onDelete: () => Promise<void>;
}) => {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
      <div
        className="absolute top-1 right-1 z-10 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <XMarkIcon className="h-4 w-4" />
      </div>
      <div
        data-testid={`picture-preview-${pictureId ?? 'default'}`}
        role="button"
        onClick={onClick}
        className="w-full h-full"
      >
        <Image
          width={140}
          height={140}
          className="object-cover w-full h-full"
          src={getImageUrlOrFile(imageUrl)}
          alt="Note image preview"
          priority={false}
        />
      </div>
    </div>
  );
};
