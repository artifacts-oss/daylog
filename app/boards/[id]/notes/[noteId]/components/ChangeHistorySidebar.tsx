'use client';

import { IconHistory, IconX, IconTrash } from '@tabler/icons-react';
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

type ChangeHistorySidebarProps = {
  noteId: number;
  isOpen: boolean;
  onClose: () => void;
  onRestoreSuccess?: () => void;
  refreshKey?: number;
};

export default function ChangeHistorySidebar({
  noteId,
  isOpen,
  onClose,
  onRestoreSuccess,
  refreshKey,
}: ChangeHistorySidebarProps) {
  const [changes, setChanges] = useState<
    Awaited<ReturnType<typeof getNoteChanges>>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [changeToDelete, setChangeToDelete] = useState<number | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [versionToRestore, setVersionToRestore] = useState<number | null>(null);

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
    }
  }, [isOpen, loadChanges, refreshKey]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className="modal-backdrop fade show d-md-none"
        onClick={onClose}
        style={{ zIndex: 1040 }}
      />

      {/* Sidebar */}
      <motion.div
        initial={{ x: 350 }}
        animate={{ x: 0 }}
        transition={{ ease: 'easeIn', duration: 0.25 }}
        className="position-fixed position-md-relative border-start h-100 overflow-auto bg-body-tertiary"
        style={{
          width: '350px',
          right: 0,
          top: 0,
          zIndex: 1050,
          maxHeight: '100vh',
        }}
      >
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center sticky-top bg-body-tertiary">
          <div className="d-flex align-items-center gap-2">
            <IconHistory size={20} />
            <h5 className="mb-0">Change History</h5>
          </div>
          <div className="d-flex align-items-center gap-1">
            {changes.length > 0 && (
              <button
                className="btn btn-sm btn-ghost-danger"
                disabled={isLoading}
                title="Clear all history"
                aria-label="Clear all history"
                data-bs-toggle="modal"
                data-bs-target="#clear-history-modal"
              >
                <IconTrash size={18} />
              </button>
            )}
            <button
              className="btn btn-sm btn-ghost-secondary"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="p-3">
          {isLoading && (
            <div className="text-center py-4">
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          )}

          {!isLoading && changes.length === 0 && (
            <div className="text-center text-muted py-4">
              <IconHistory size={48} className="mb-2 opacity-50" />
              <p className="mb-0">No changes yet</p>
              <p className="text-sm">
                Changes will appear here as you edit this note
              </p>
            </div>
          )}

          {!isLoading &&
            changes.map((change) => (
              <ChangeHistoryItem
                key={change.id}
                change={change}
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
                deleteModalTarget="#delete-change-modal"
                restoreModalTarget="#restore-version-modal"
                commentDeleteModalTarget="#delete-comment-modal"
              />
            ))}
        </div>
      </motion.div>

      <DeleteHistoryModal
        id="clear-history-modal"
        title="Clear all history?"
        description="Do you really want to clear all history for this note? This action cannot be undone."
        actionLabel="Yes, clear all"
        onConfirm={handleClearHistory}
        isLoading={isLoading}
      />

      <DeleteHistoryModal
        id="delete-change-modal"
        title="Delete history entry?"
        description="Are you sure you want to delete this specific change from history? This action cannot be undone."
        actionLabel="Yes, delete"
        onConfirm={handleItemDelete}
        isLoading={isLoading}
      />

      <DeleteHistoryModal
        id="restore-version-modal"
        title="Restore note?"
        description="Are you sure you want to restore the note to this version? This will replace the current content."
        actionLabel="Yes, restore"
        onConfirm={handleVersionRestore}
        isLoading={isLoading}
        variant="primary"
      />

      <DeleteHistoryModal
        id="delete-comment-modal"
        title="Delete comment?"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        actionLabel="Yes, delete"
        onConfirm={handleCommentDelete}
        isLoading={isLoading}
      />
    </>
  );
}
