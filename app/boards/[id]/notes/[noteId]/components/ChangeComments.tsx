'use client';

import { IconSend, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { addChangeComment } from '../../lib/actions';
import { truncateWord } from '@/utils/text';

type ChangeCommentsProps = {
  changeId: number;
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
  onRefresh: () => void;
  onDeleteRequest?: (commentId: number) => void;
  deleteModalTarget?: string;
};

export default function ChangeComments({
  changeId,
  comments,
  onRefresh,
  onDeleteRequest,
  deleteModalTarget,
}: ChangeCommentsProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const comment = await addChangeComment(changeId, newComment.trim());
    setIsSubmitting(false);

    if (comment) {
      setNewComment('');
      onRefresh();
    }
  };

  const handleDelete = (commentId: number) => {
    onDeleteRequest?.(commentId);
  };

  return (
    <div className="border-top pt-3">
      <h6 className="mb-2">Comments</h6>

      {comments.length === 0 && (
        <p className="text-muted text-sm mb-2">No comments yet</p>
      )}

      {comments.map((comment) => (
        <div key={comment.id} className="mb-2 p-2 border rounded">
          <div className="d-flex justify-content-between align-items-start">
            <div className="flex-grow-1">
              <div className="d-flex flex-column align-items-start mb-1">
                <strong
                  className="text-xs"
                  title={`${comment.user.name}\n${comment.user.email}`}
                >
                  {truncateWord(comment.user.name ?? comment.user.email, 20)}
                </strong>
                <span className="text-muted text-xs">
                  {new Intl.DateTimeFormat('default', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(comment.createdAt))}
                </span>
              </div>
              <p className="text-sm mb-0">{comment.content}</p>
            </div>
            <button
              className="btn btn-sm btn-ghost-danger"
              onClick={() => handleDelete(comment.id)}
              title="Delete comment"
              data-bs-toggle="modal"
              data-bs-target={deleteModalTarget}
            >
              <IconTrash size={14} />
            </button>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="mt-2">
        <div className="input-group input-group-sm">
          <input
            type="text"
            className="form-control"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || !newComment.trim()}
          >
            <IconSend size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
