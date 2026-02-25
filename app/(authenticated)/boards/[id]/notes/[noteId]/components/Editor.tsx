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
import {
  PhotoIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

type NoteEditorType = {
  note: Note;
};

export default function Editor({ note }: NoteEditorType) {
  const router = useRouter();

  const [markdown, setMarkdown] = useState(note.content ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
    null,
  );

  const updateNoteHandler = useCallback(
    async (content: string) => {
      if (!note) return;
      await updateNote({ ...note, content });
    },
    [note],
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
    [updateNoteHandler, debounceTimer],
  );

  const saveContent = useCallback(
    (content: string) => {
      localStorage.setItem(`note-${note.id}`, content);
      setIsSaving(true);
      debounceSave(content, () => {
        setIsSaving(false);
      });
    },
    [note.id, debounceSave],
  );

  useEffect(() => {
    if (markdown !== localStorage.getItem(`note-${note.id}`)) {
      saveContent(markdown);
    }
  }, [markdown, note.id, saveContent]);

  const handlePlaceImage = (imageUrl: string) => {
    const textarea = document.getElementsByClassName(
      'w-md-editor-text-input',
    )[0] as HTMLTextAreaElement;
    const leftContent = markdown.substring(0, textarea.selectionStart);
    const rightContent = markdown.substring(textarea.selectionStart);
    const newContent =
      leftContent + '![alt text](' + imageUrl + ')' + rightContent;

    setMarkdown(newContent);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
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
    <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
      {/* Sidebar for Pictures */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: -50 }}
            animate={{ width: 340, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -50 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="flex-shrink-0 flex flex-col gap-6 sticky top-24 overflow-hidden"
          >
            <div className="w-[340px] rounded-[20px] bg-muted border border-border p-6 flex flex-col gap-6 shadow-sm">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[20px] font-[800] text-foreground tracking-tight">
                    Pictures
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-accent transition-colors"
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <XMarkIcon className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>
                <p className="text-[14px] font-[500] text-muted-foreground leading-relaxed">
                  Click to insert an image into the editor at your cursor
                  position.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 min-h-[120px] content-start">
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

                {pictures.length === 0 && note.imageUrl === null && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-border rounded-[16px] bg-background">
                    <PhotoIcon className="h-8 w-8 text-muted-foreground/70 mb-2 opacity-50" />
                    <p className="text-[12px] font-[500] text-muted-foreground/70 uppercase tracking-wider">
                      No pictures
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-[12px] font-[700] text-primary-foreground shadow-sm transition-all"
                >
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  Upload Picture
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Editor Area */}
      <motion.div
        layout
        className="flex-1 w-full flex flex-col gap-4 min-w-0 my-1"
      >
        <div className="flex justify-between items-center w-full">
          <Button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            variant="outline"
            className="rounded-[12px] bg-background text-foreground border-border hover:bg-accent shadow-sm font-[600] transition-all"
          >
            <PhotoIcon className="h-5 w-5 mr-2 text-muted-foreground" />
            {isSidebarOpen ? 'Close Gallery' : 'Open Gallery'}
            {isSidebarOpen ? (
              <ChevronLeftIcon className="h-4 w-4 ml-2 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 ml-2 text-muted-foreground" />
            )}
          </Button>

          <AnimatePresence>
            {isSaving && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 bg-background border border-border px-3 py-1.5 rounded-[12px] shadow-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[12px] font-[500] text-muted-foreground uppercase tracking-wider">
                  Saving
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="rounded-[20px] bg-background border border-border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-500">
          <div data-color-mode={theme} className="w-full">
            <MDEditor
              data-testid="editor"
              height={600}
              minHeight={400}
              value={markdown}
              onChange={(value) => setMarkdown(value ?? '')}
              previewOptions={{
                rehypePlugins: [[rehypeSanitize]],
              }}
              style={{ borderRadius: 0, border: 'none' }}
              className="!border-0 !rounded-none !bg-background"
            />
          </div>
        </div>
      </motion.div>
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
    <div className="relative aspect-square rounded-[12px] overflow-hidden cursor-pointer group border border-border bg-background shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-border transition-all duration-300">
      <div
        className="absolute top-1.5 right-1.5 z-10 bg-background border border-border text-muted-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-accent hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete picture"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </div>
      <div
        data-testid={`picture-preview-${pictureId ?? 'default'}`}
        role="button"
        onClick={onClick}
        className="w-full h-full p-1"
      >
        <Image
          width={140}
          height={140}
          className="object-cover w-full h-full rounded-[8px]"
          src={getImageUrlOrFile(imageUrl)}
          alt="Note image preview"
          priority={false}
        />
      </div>
    </div>
  );
};
