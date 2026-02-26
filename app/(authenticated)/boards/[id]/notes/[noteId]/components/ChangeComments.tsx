'use client';

import { Send, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { addChangeComment } from '../../lib/actions';
import { truncateWord } from '@/utils/text';
import { Button } from '@/components/ui/button';

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
  isNoteOwner?: boolean;
  currentUserId?: number;
};

export default function ChangeComments({
  changeId,
  comments,
  onRefresh,
  onDeleteRequest,
  isNoteOwner,
  currentUserId,
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
    <div className="flex flex-col gap-2.5">
      <h6 className="text-[13px] font-[800] text-foreground tracking-tight">
        Comments
      </h6>

      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground italic mb-2">
          No comments yet
        </p>
      )}

      {comments.map((comment) => (
        <div
          key={comment.id}
          className="relative group p-2.5 bg-secondary/30 rounded-lg border border-border/50 text-sm"
        >
          <div className="flex justify-between items-start gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col mb-1">
                <strong
                  className="text-[12px] font-bold text-foreground truncate"
                  title={`${comment.user.name}\n${comment.user.email}`}
                >
                  {truncateWord(comment.user.name ?? comment.user.email, 20)}
                </strong>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {new Intl.DateTimeFormat('default', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(comment.createdAt))}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed break-words">
                {comment.content}
              </p>
            </div>
            {(isNoteOwner || currentUserId === comment.userId) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                onClick={() => handleDelete(comment.id)}
                title="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="mt-1 relative">
        <input
          type="text"
          className="w-full h-8 pl-2.5 pr-8 text-[12px] rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          className="absolute right-0.5 top-0.5 h-7 w-7 rounded-md text-primary hover:bg-primary/10 hover:text-primary disabled:opacity-50"
          disabled={isSubmitting || !newComment.trim()}
        >
          <Send className="h-3 w-3" />
        </Button>
      </form>
    </div>
  );
}
