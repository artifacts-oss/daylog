'use client';

import { IconMessageCircle, IconTrash, IconRestore } from '@tabler/icons-react';
import { useState } from 'react';
import ChangeComments from './ChangeComments';
import { getDiffSummary, getDiffPreview } from '@/utils/diff';
import { truncateWord } from '@/utils/text';

type ChangeHistoryItemProps = {
  change: {
    id: number;
    noteId: number;
    userId: number;
    diffPatch: string;
    previousContent: string | null;
    createdAt: Date;
    user: {
      id: number;
      name: string | null;
      email: string;
    };
    comments: Array<{
      id: number;
      changeId: number;
      userId: number;
      content: string;
      createdAt: Date;
      user: {
        id: number;
        name: string | null;
        email: string;
      };
    }>;
  };
  onRefresh: () => void;
  onRestoreSuccess?: () => void;
  onDeleteRequest?: (changeId: number) => void;
  onRestoreRequest?: (changeId: number) => void;
  onCommentDeleteRequest?: (commentId: number) => void;
  deleteModalTarget?: string;
  restoreModalTarget?: string;
  commentDeleteModalTarget?: string;
};

export default function ChangeHistoryItem({
  change,
  onRefresh,
  onDeleteRequest,
  onRestoreRequest,
  onCommentDeleteRequest,
  deleteModalTarget,
  restoreModalTarget,
  commentDeleteModalTarget,
}: ChangeHistoryItemProps) {
  const [showComments, setShowComments] = useState(false);

  const diffSummary = getDiffSummary(change.diffPatch);
  const diffPreview = getDiffPreview(change.diffPatch);

  const handleRestore = () => {
    onRestoreRequest?.(change.id);
  };

  return (
    <div className="card mb-2">
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="flex-grow-1">
            <div className="d-flex flex-column align-items-start mb-1">
              <strong
                className="text-sm"
                title={change.user.name ?? change.user.email}
              >
                {truncateWord(change.user.name ?? change.user.email, 30)}
              </strong>
              <span className="text-muted text-xs">
                {new Intl.DateTimeFormat('default', {
                  dateStyle: 'short',
                  timeStyle: 'medium',
                }).format(new Date(change.createdAt))}
              </span>
            </div>
            <div className="text-muted text-xs">
              <span className="text-success">+{diffSummary.additions}</span>
              {' / '}
              <span className="text-danger">-{diffSummary.deletions}</span>
              {' characters'}
            </div>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-sm text-muted italic mb-0 line-clamp-2 p-2 rounded border">
            &quot;{diffPreview}&quot;
          </p>
        </div>

        <div className="btn-list">
          <button
            className="btn btn-sm btn-ghost-primary"
            title="Restore note to this version"
            data-bs-toggle="modal"
            data-bs-target={restoreModalTarget}
            onClick={handleRestore}
          >
            <IconRestore size={16} />
            <span className="ms-1">Restore</span>
          </button>
          <button
            className={`btn btn-sm ${change.comments.length > 0 ? 'btn-ghost-primary' : 'btn-ghost-secondary'}`}
            onClick={() => setShowComments(!showComments)}
            title="Toggle comments"
          >
            <IconMessageCircle size={16} />
            <span className="ms-1">Comments ({change.comments.length})</span>
          </button>
          <button
            className="btn btn-sm btn-ghost-danger ms-auto"
            title="Delete this change from history"
            data-bs-toggle="modal"
            data-bs-target={deleteModalTarget}
            onClick={() => onDeleteRequest?.(change.id)}
          >
            <IconTrash size={16} />
          </button>
        </div>

        {showComments && (
          <div className="mt-3">
            <ChangeComments
              changeId={change.id}
              comments={change.comments}
              onRefresh={onRefresh}
              onDeleteRequest={onCommentDeleteRequest}
              deleteModalTarget={commentDeleteModalTarget}
            />
          </div>
        )}
      </div>
    </div>
  );
}
