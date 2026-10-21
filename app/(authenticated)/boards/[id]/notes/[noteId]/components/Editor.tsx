'use client';

import { Note, Picture, Attachment } from '@/prisma/generated/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  savePicture,
  updateNote,
  getPictures,
  deletePicture,
  deleteImage,
  getAttachments,
} from '../../lib/actions';
import { adjustCursorOffset } from '@/utils/diff';
import Image from 'next/image';
import { getImageUrlOrFile, resizeImage } from '@/utils/image';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { useTheme } from 'next-themes';
import {
  PhotoIcon,
  XMarkIcon,
  PaperClipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { FAST } from '@/lib/motion';
import ChangeHistorySidebar from './ChangeHistorySidebar';
import AttachmentSidebar from './AttachmentSidebar';
import AiSidebar from './AiSidebar';
import { History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import UserAvatar from '@/components/UserAvatar';

type PresenceUser = {
  userId: number;
  userName: string;
  color: string;
};

type NoteEditorType = {
  note: Note;
  isOwner?: boolean;
  canDeleteHistory?: boolean;
  currentUserId?: number;
  remoteContent?: string | null;
  onContentChange?: (content: string) => void;
  onCursorLineChange?: (line: number) => void;
  presenceUsers?: PresenceUser[];
  aiEnabled?: boolean;
};

export default function Editor({
  note,
  isOwner,
  canDeleteHistory,
  currentUserId,
  remoteContent,
  onContentChange,
  onCursorLineChange,
  presenceUsers,
  aiEnabled,
}: NoteEditorType) {
  const router = useRouter();
  const t = useTranslations('NoteEditor');

  // Use a ref to track the initial note content so we only initialise from
  // the server value once per note (not on every autosave revalidation).
  const initialContentRef = useRef<{ id: number; content: string } | null>(
    null,
  );

  const [markdown, setMarkdown] = useState(() => {
    // On first render, also seed localStorage so the save-guard logic works.
    return note.content ?? '';
  });

  const [isSaving, setIsSaving] = useState(false);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks content waiting to be persisted so unmount/beforeunload can flush it
  const pendingContentRef = useRef<string | null>(null);
  const noteRef = useRef(note);

  const { theme } = useTheme();

  const loadPictures = useCallback(async () => {
    try {
      setPictures((await getPictures(note.id)) ?? []);
    } catch (error) {
      console.error(error);
    }
  }, [note.id]);

  const loadAttachments = useCallback(async () => {
    try {
      setAttachments((await getAttachments(note.id)) ?? []);
    } catch (error) {
      console.error(error);
    }
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
    void loadPictures();
    void loadAttachments();
  }, [note.id, loadPictures, loadAttachments]);

  // Sync local state only when the user navigates to a *different* note
  // (note.id changes) or on the very first mount. This prevents an autosave
  // revalidation from overwriting what the user is currently typing.
  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  useEffect(() => {
    if (
      initialContentRef.current === null ||
      initialContentRef.current.id !== note.id
    ) {
      const content = note.content ?? '';
      initialContentRef.current = { id: note.id, content };
      setMarkdown(content);
      localStorage.setItem(`note-${note.id}`, content);
    }
  }, [note.id, note.content]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isApplyingRemote = useRef(false);

  const updateNoteHandler = useCallback(
    async (content: string) => {
      if (!note) return;
      await updateNote({ ...note, content });
      setSidebarRefreshKey((prev) => prev + 1);
    },
    [note],
  );

  const debounceSave = useCallback(
    (content: string, callback: () => void) => {
      // Clear the previous timer
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

      // Set a new timer
      debounceTimerRef.current = setTimeout(() => {
        updateNoteHandler(content).catch(console.error).finally(callback);
      }, 1000); // Waits for 1 second of inactivity before saving
    },
    [updateNoteHandler],
  );

  const saveContent = useCallback(
    (content: string) => {
      localStorage.setItem(`note-${note.id}`, content);
      onContentChange?.(content);
      setIsSaving(true);
      pendingContentRef.current = content;
      debounceSave(content, () => {
        setIsSaving(false);
        pendingContentRef.current = null;
      });
    },
    [note.id, debounceSave, onContentChange],
  );

  useEffect(() => {
    if (!isApplyingRemote.current && markdown !== localStorage.getItem(`note-${note.id}`)) {
      saveContent(markdown);
    }
  }, [markdown, note.id, saveContent]);

  // Apply incoming remote content from collaborative session
  useEffect(() => {
    if (remoteContent == null || remoteContent === markdown) return;

    const textarea = document.querySelector(
      '.w-md-editor-text-input',
    ) as HTMLTextAreaElement | null;
    const selStart = textarea?.selectionStart ?? 0;
    const selEnd = textarea?.selectionEnd ?? 0;

    // Map the cursor through the diff so insertions/deletions before the
    // caret don't displace it to the wrong position in the merged content.
    const adjustedStart = adjustCursorOffset(markdown, remoteContent, selStart);
    const adjustedEnd = adjustCursorOffset(markdown, remoteContent, selEnd);

    isApplyingRemote.current = true;
    setMarkdown(remoteContent);
    localStorage.setItem(`note-${note.id}`, remoteContent);

    requestAnimationFrame(() => {
      const el = document.querySelector(
        '.w-md-editor-text-input',
      ) as HTMLTextAreaElement | null;
      if (el) {
        el.selectionStart = adjustedStart;
        el.selectionEnd = adjustedEnd;
      }
      isApplyingRemote.current = false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteContent]);

  // Flush pending autosave when the component unmounts (e.g. user navigates away)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null && pendingContentRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        void updateNote({ ...noteRef.current, content: pendingContentRef.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Best-effort flush on tab/browser close via keepalive-capable Server Action call
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingContentRef.current !== null) {
        void updateNote({ ...noteRef.current, content: pendingContentRef.current });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handlePlaceAttachmentLink = (fileName: string, fileUrl: string) => {
    const textarea = document.getElementsByClassName(
      'w-md-editor-text-input',
    )[0] as HTMLTextAreaElement;
    const leftContent = markdown.substring(0, textarea.selectionStart);
    const rightContent = markdown.substring(textarea.selectionStart);
    const newContent = leftContent + `[${fileName}](${fileUrl})` + rightContent;

    setMarkdown(newContent);
  };

  // AI works on the selection if there is one, otherwise on the whole note
  const getAiSource = () => {
    const textarea = document.querySelector(
      '.w-md-editor-text-input',
    ) as HTMLTextAreaElement | null;
    const start = textarea?.selectionStart ?? 0;
    const end = textarea?.selectionEnd ?? 0;
    if (start !== end) {
      return { text: markdown.substring(start, end), start, end };
    }
    return { text: markdown, start: 0, end: markdown.length };
  };

  // shortcut: offsets come from when the AI request started; concurrent collab edits may shift them.
  const handleAiInsert = (text: string, start: number, end: number) => {
    const separator = start === end && start > 0 ? '\n\n' : '';
    setMarkdown(
      markdown.substring(0, start) + separator + text + markdown.substring(end),
    );
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      resizeImage(file, 1920, 1080, async (resizedDataUrl) => {
        const imageUrl = await savePicture({
          noteId: note.id,
          imageUrl: resizedDataUrl,
        });
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
    <>
      <motion.div
        layout
        className="flex flex-col lg:flex-row items-stretch w-full"
      >
        {/* Sidebar for History */}
        <AnimatePresence>
          {showHistory && (
            <ChangeHistorySidebar
              noteId={note.id}
              isOwner={canDeleteHistory ?? isOwner}
              currentUserId={currentUserId}
              isOpen={showHistory}
              onClose={() => setShowHistory(false)}
              onRestoreSuccess={() => {
                initialContentRef.current = null;
                router.refresh();
              }}
              refreshKey={sidebarRefreshKey}
            />
          )}
        </AnimatePresence>

        {/* Sidebar for Pictures */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              layout
              initial={{
                width: 0,
                opacity: 0,
              }}
              animate={{
                width:
                  typeof window !== 'undefined' && window.innerWidth < 1024
                    ? '100%'
                    : 340,
                opacity: 1,
              }}
              exit={{
                width: 0,
                opacity: 0,
              }}
              transition={FAST}
              className="flex-shrink-0 flex flex-col overflow-hidden max-lg:!mr-0 max-lg:mb-6 lg:mb-0 self-start w-full lg:w-[340px] lg:mr-6"
            >
              <div className="w-full lg:w-[340px] rounded-[20px] bg-muted border border-border p-6 flex flex-col gap-6 shadow-sm h-fit max-h-[calc(100vh-120px)] overflow-hidden">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[20px] font-[800] text-foreground tracking-tight">
                      {t('pictures')}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full hover:bg-accent transition-colors"
                      onClick={() => setIsSidebarOpen(false)}
                      aria-label={t('closeSidebar')}
                    >
                      <XMarkIcon className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-[14px] font-[500] text-muted-foreground leading-relaxed">
                    {t('picturesHelp')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 min-h-[120px] content-start overflow-y-auto custom-scrollbar pr-2">
                  {note &&
                    note.imageUrl &&
                    PicturePreview({
                      imageUrl: note.imageUrl,
                      onClick: () => {
                        handlePlaceImage(getImageUrlOrFile(note.imageUrl!));
                      },
                      onDelete: async () => {
                        await deleteImage(note.id);
                        router.refresh();
                      },
                      deleteLabel: t('deletePicture'),
                    })}
                  {pictures.map((picture, key) => (
                    <PicturePreview
                      key={key}
                      pictureId={picture.id}
                      onDelete={() => handleDeletePicture(picture.id)}
                      imageUrl={picture.imageUrl}
                      deleteLabel={t('deletePicture')}
                      onClick={() => {
                        handlePlaceImage(getImageUrlOrFile(picture.imageUrl));
                      }}
                    />
                  ))}

                  {pictures.length === 0 && note.imageUrl === null && (
                    <div className="col-span-2 flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-border rounded-[16px] bg-background">
                      <PhotoIcon className="h-8 w-8 text-muted-foreground/70 mb-2 opacity-50" />
                      <p className="text-[12px] font-[500] text-muted-foreground/70 uppercase tracking-wider">
                        {t('noPictures')}
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
                    {t('uploadPicture')}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar for Attachments */}
        <AnimatePresence>
          {isAttachmentsOpen && (
            <motion.div
              layout
              initial={{
                width: 0,
                opacity: 0,
              }}
              animate={{
                width:
                  typeof window !== 'undefined' && window.innerWidth < 1024
                    ? '100%'
                    : 340,
                opacity: 1,
              }}
              exit={{
                width: 0,
                opacity: 0,
              }}
              transition={FAST}
              className="flex-shrink-0 flex flex-col overflow-hidden max-lg:!mr-0 max-lg:mb-6 lg:mb-0 self-start w-full lg:w-[340px] lg:mr-6"
            >
              <AttachmentSidebar
                noteId={note.id}
                attachments={attachments}
                onAttachmentsChange={loadAttachments}
                onInsertLink={handlePlaceAttachmentLink}
                onClose={() => setIsAttachmentsOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar for AI assistant */}
        <AnimatePresence>
          {isAiOpen && (
            <motion.div
              layout
              initial={{
                width: 0,
                opacity: 0,
              }}
              animate={{
                width:
                  typeof window !== 'undefined' && window.innerWidth < 1024
                    ? '100%'
                    : 340,
                opacity: 1,
              }}
              exit={{
                width: 0,
                opacity: 0,
              }}
              transition={FAST}
              className="flex-shrink-0 flex flex-col overflow-hidden max-lg:!mr-0 max-lg:mb-6 lg:mb-0 self-start w-full lg:w-[340px] lg:mr-6"
            >
              <AiSidebar
                noteId={note.id}
                getSource={getAiSource}
                onInsert={handleAiInsert}
                onClose={() => setIsAiOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Editor Area */}
        <motion.div
          layout
          className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden"
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setIsSidebarOpen(!isSidebarOpen);
                  if (!isSidebarOpen) {
                    setShowHistory(false);
                    setIsAttachmentsOpen(false);
                    setIsAiOpen(false);
                  }
                }}
                variant="outline"
                className={`rounded-[12px] border-border shadow-sm font-[600] transition-all px-3 md:px-4 ${
                  isSidebarOpen
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background text-foreground hover:bg-accent'
                }`}
              >
                <PhotoIcon className="h-5 w-5 md:mr-2 text-muted-foreground" />
                <span className="hidden md:inline">
                  {isSidebarOpen ? t('closeGallery') : t('openGallery')}
                </span>
              </Button>

              <Button
                onClick={() => {
                  setIsAttachmentsOpen(!isAttachmentsOpen);
                  if (!isAttachmentsOpen) {
                    setShowHistory(false);
                    setIsSidebarOpen(false);
                    setIsAiOpen(false);
                  }
                }}
                variant="outline"
                className={`rounded-[12px] border-border shadow-sm font-[600] transition-all px-3 md:px-4 ${
                  isAttachmentsOpen
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background text-foreground hover:bg-accent'
                }`}
                title={t('toggleAttachments')}
              >
                <PaperClipIcon className="h-5 w-5 md:mr-2 text-muted-foreground" />
                <span className="hidden md:inline">
                  {isAttachmentsOpen ? t('closeAttachments') : t('openAttachments')}
                </span>
              </Button>

              <Button
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory) {
                    setIsSidebarOpen(false);
                    setIsAttachmentsOpen(false);
                    setIsAiOpen(false);
                  }
                }}
                variant="outline"
                className={`rounded-[12px] border-border shadow-sm font-[600] transition-all px-3 md:px-4 ${
                  showHistory
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background text-foreground hover:bg-accent'
                }`}
                title={t('toggleChangeHistory')}
              >
                <History className="h-4 w-4 md:mr-2 text-muted-foreground" />
                <span className="hidden md:inline">
                  {showHistory ? t('closeHistory') : t('openHistory')}
                </span>
              </Button>

              {aiEnabled && (
                <Button
                  onClick={() => {
                    setIsAiOpen(!isAiOpen);
                    if (!isAiOpen) {
                      setShowHistory(false);
                      setIsSidebarOpen(false);
                      setIsAttachmentsOpen(false);
                    }
                  }}
                  variant="outline"
                  className={`rounded-[12px] border-border shadow-sm font-[600] transition-all px-3 md:px-4 ${
                    isAiOpen
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-background text-foreground hover:bg-accent'
                  }`}
                  title={t('toggleAi')}
                >
                  <SparklesIcon className="h-5 w-5 md:mr-2 text-muted-foreground" />
                  <span className="hidden md:inline">
                    {isAiOpen ? t('closeAi') : t('openAi')}
                  </span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {presenceUsers && presenceUsers.length > 0 && (
                <TooltipProvider delayDuration={300}>
                  <div className="flex items-center -space-x-1.5">
                    {presenceUsers.map((user) => (
                      <Tooltip key={user.userId}>
                        <TooltipTrigger asChild>
                          <UserAvatar
                            name={user.userName}
                            imageSrc={`/api/v1/users/${user.userId}/avatar`}
                            className="h-7 w-7 ring-2 ring-background"
                            fallbackClassName="text-[11px] font-bold text-white"
                            fallbackStyle={{ backgroundColor: user.color }}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{user.userName}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              )}
              <AnimatePresence>
                {isSaving && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 bg-background border border-border px-2 md:px-3 py-1.5 rounded-[12px] shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] md:text-[12px] font-[500] text-muted-foreground uppercase tracking-wider hidden sm:inline">
                      {t('saving')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="rounded-[20px] bg-background border border-border shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-500">
            <div data-color-mode={theme} className="w-full">
              <MDEditor
                data-testid="editor"
                height={600}
                minHeight={400}
                value={markdown}
                onChange={(value) => setMarkdown(value ?? '')}
                onStatistics={(stats) => {
                  if (onCursorLineChange) {
                    const line = stats.text
                      .substring(0, stats.selection.start)
                      .split('\n').length;
                    onCursorLineChange(line);
                  }
                }}
                previewOptions={{
                  rehypePlugins: [[rehypeSanitize]],
                }}
                style={{ borderRadius: 0, border: 'none' }}
                className="!border-0 !rounded-none !bg-background"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

const PicturePreview = ({
  pictureId,
  imageUrl,
  onClick,
  onDelete,
  deleteLabel,
}: {
  pictureId?: number | null;
  imageUrl: string;
  onClick: () => void;
  onDelete: () => Promise<void>;
  deleteLabel: string;
}) => {
  return (
    <div className="relative aspect-square rounded-[12px] overflow-hidden cursor-pointer group border border-border bg-background shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-border transition-all duration-300">
      <div
        className="absolute top-1.5 right-1.5 z-10 bg-background border border-border text-muted-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-accent hover:text-foreground"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            void onDelete();
          }
        }}
        onClick={(e) => {
          e.stopPropagation();
          void onDelete();
        }}
        title={deleteLabel}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </div>
      <div
        data-testid={`picture-preview-${pictureId ?? 'default'}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
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
