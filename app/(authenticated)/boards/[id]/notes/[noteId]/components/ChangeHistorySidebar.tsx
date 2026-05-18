'use client';

import { History, X, Trash2 } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import {
  getNoteChanges,
  clearNoteHistory,
  deleteNoteChange,
  deleteChangeComment,
  restoreToVersion,
} from '../../lib/actions';
import ChangeHistoryItem from './ChangeHistoryItem';
import DeleteHistoryModal from './DeleteHistoryModal';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

type ChangeHistorySidebarProps = {
  noteId: number;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
  refreshKey?: number;
  isOwner?: boolean;
  currentUserId?: number;
};

export default function ChangeHistorySidebar({
  noteId,
  isOpen,
  onClose,
  onRestoreSuccess,
  refreshKey,
  isOwner,
  currentUserId,
}: ChangeHistorySidebarProps) {
  const t = useTranslations('NoteEditor');
  const [changes, setChanges] = useState<
    Awaited<ReturnType<typeof getNoteChanges>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showClearHistory, setShowClearHistory] = useState(false);
  const [changeToDelete, setChangeToDelete] = useState<number | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(4);

  const loadChanges = useCallback(async () => {
    setIsLoading(true);
    const data = await getNoteChanges(noteId);
    setChanges(data);
    setIsLoading(false);
  }, [noteId]);

  const handleClearHistory = async () => {
    setIsLoading(true);
    const success = await clearNoteHistory(noteId);
    if (success) {
      await loadChanges();
    }
    setShowClearHistory(false);
    setIsLoading(false);
  };
  const handleItemDelete = async () => {
    if (changeToDelete === null) return;
    setIsLoading(true);
    const success = await deleteNoteChange(changeToDelete);
    if (success) {
      await loadChanges();
    }
    setChangeToDelete(null);
    setIsLoading(false);
  };

  const handleCommentDelete = async () => {
    if (commentToDelete === null) return;
    setIsLoading(true);
    const success = await deleteChangeComment(commentToDelete);
    if (success) {
      await loadChanges();
    }
    setCommentToDelete(null);
    setIsLoading(false);
  };

  const handleVersionRestore = async () => {
    if (versionToRestore === null) return;
    setIsLoading(true);
    const result = await restoreToVersion(noteId, versionToRestore);
    if (result.success) {
      onRestoreSuccess?.();
      await loadChanges();
    }
    setVersionToRestore(null);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadChanges();
      setVisibleCount(4);
    }
  }, [isOpen, loadChanges, refreshKey]);

  return (
    <>
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
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="flex-shrink-0 flex flex-col overflow-hidden max-lg:!ml-0 max-lg:mb-6 lg:mb-0 self-start w-full lg:w-[340px] lg:mr-6"
      >
        <div className="w-full lg:w-[340px] rounded-[20px] bg-muted border border-border p-6 flex flex-col gap-6 shadow-sm h-fit max-h-[calc(100vh-120px)] overflow-hidden">
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[20px] font-[800] text-foreground tracking-tight flex items-center gap-2">
                {t('changeHistory')}
              </h3>
              <div className="flex items-center gap-2">
                {changes.length > 0 && isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isLoading}
                    title={t('clearAllHistory')}
                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={() => setShowClearHistory(true)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('closeSidebar')}
                  className="h-8 w-8 rounded-full hover:bg-accent transition-colors"
                  onClick={onClose}
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-2 flex flex-col gap-3 content-start">
            {isLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="w-6 h-6 border-4 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {!isLoading && changes.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/70 py-8 opacity-50 space-y-2">
                <History className="h-12 w-12" />
                <p className="text-xs font-bold uppercase tracking-widest text-center">
                  {t('noChangesYet')}
                </p>
                <p className="text-[11px] text-center">
                  {t('changesAppear')}
                </p>
              </div>
            )}

            {!isLoading &&
              changes.slice(0, visibleCount).map((change) => (
                <ChangeHistoryItem
                  key={change.id}
                  change={change}
                  isOwner={isOwner}
                  currentUserId={currentUserId}
                  onRefresh={loadChanges}
                  onRestoreSuccess={onRestoreSuccess}
                  onDeleteRequest={(id) => {
                    setChangeToDelete(id);
                  }}
                  onRestoreRequest={(id) => {
                    setVersionToRestore(id);
                  }}
                  onCommentDeleteRequest={(id) => {
                    setCommentToDelete(id);
                  }}
                />
              ))}

            {!isLoading && changes.length > visibleCount && (
              <Button
                variant="outline"
                className="w-full mt-1 mb-2 font-bold bg-background text-primary hover:bg-accent border-border"
                onClick={() => setVisibleCount((prev) => prev + 4)}
              >
                {t('viewPreviousChanges')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <DeleteHistoryModal
        isOpen={showClearHistory}
        onOpenChange={setShowClearHistory}
        title={t('clearHistoryTitle')}
        description={t('clearHistoryDescription')}
        actionLabel={t('clearHistoryAction')}
        onConfirm={handleClearHistory}
        isLoading={isLoading}
      />

      <DeleteHistoryModal
        isOpen={changeToDelete !== null}
        onOpenChange={(open) => !open && setChangeToDelete(null)}
        title={t('deleteHistoryEntryTitle')}
        description={t('deleteHistoryEntryDescription')}
        actionLabel={t('deleteHistoryEntryAction')}
        onConfirm={handleItemDelete}
        isLoading={isLoading}
      />

      <DeleteHistoryModal
        isOpen={versionToRestore !== null}
        onOpenChange={(open) => !open && setVersionToRestore(null)}
        title={t('restoreNoteTitle')}
        description={t('restoreNoteDescription')}
        actionLabel={t('restoreNoteAction')}
        onConfirm={handleVersionRestore}
        isLoading={isLoading}
        variant="primary"
      />

      <DeleteHistoryModal
        isOpen={commentToDelete !== null}
        onOpenChange={(open) => !open && setCommentToDelete(null)}
        title={t('deleteCommentTitle')}
        description={t('deleteCommentDescription')}
        actionLabel={t('deleteCommentAction')}
        onConfirm={handleCommentDelete}
        isLoading={isLoading}
      />
    </>
  );
}
