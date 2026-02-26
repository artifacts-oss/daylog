'use client';

import { MessageCircle, Trash2, History } from 'lucide-react';
import { useState } from 'react';
import ChangeComments from './ChangeComments';
import { getDiffSummary, getDiffPreview } from '@/utils/diff';
import { truncateWord } from '@/utils/text';
import { Button } from '@/components/ui/button';

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
  isOwner?: boolean;
  currentUserId?: number;
};

export default function ChangeHistoryItem({
  change,
  onRefresh,
  onDeleteRequest,
  onRestoreRequest,
  onCommentDeleteRequest,
  isOwner,
  currentUserId,
}: ChangeHistoryItemProps) {
  const [showComments, setShowComments] = useState(false);

  const diffSummary = getDiffSummary(change.diffPatch);
  const diffPreview = getDiffPreview(change.diffPatch);

  const handleRestore = () => {
    onRestoreRequest?.(change.id);
  };

  return (
    <div className="bg-background rounded-[16px] border border-border p-3 shadow-sm relative overflow-hidden group transition-all duration-300 hover:shadow-md hover:border-foreground/20 shrink-0">
      <div className="flex flex-col mb-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <strong
            className="text-[13px] font-[800] tracking-tight text-foreground truncate"
            title={change.user.name ?? change.user.email}
          >
            {truncateWord(change.user.name ?? change.user.email, 22)}
          </strong>
          <div className="text-muted-foreground text-[10px] font-bold bg-muted/70 px-1.5 py-0.5 rounded inline-flex shrink-0 gap-1 items-center">
            <span className="text-green-600">+{diffSummary.additions}</span>
            <span className="opacity-40">/</span>
            <span className="text-red-500">-{diffSummary.deletions}</span>
          </div>
        </div>

        <span className="text-muted-foreground text-[10px] font-[600] uppercase tracking-widest">
          {new Intl.DateTimeFormat('default', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(change.createdAt))}
        </span>
      </div>

      <div className="mb-3 mt-1.5">
        <p className="text-[11px] text-muted-foreground italic mb-0 line-clamp-2 p-2.5 bg-secondary/30 rounded-lg border border-border/50 leading-relaxed">
          &quot;{diffPreview}&quot;
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 rounded-[8px] font-[700] text-[11px] hover:bg-primary hover:text-primary-foreground"
          title="Restore note to this version"
          onClick={handleRestore}
        >
          <History className="h-3 w-3 mr-1.5" />
          Restore
        </Button>
        <Button
          variant={change.comments.length > 0 ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 px-2.5 rounded-[8px] font-[700] text-[11px] bg-secondary/50"
          onClick={() => setShowComments(!showComments)}
          title="Toggle comments"
        >
          <MessageCircle className="h-3 w-3 mr-1.5" />
          {change.comments.length > 0
            ? `${change.comments.length} Comments`
            : 'Comment'}
        </Button>
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto transition-colors"
            title="Delete this change from history"
            onClick={() => onDeleteRequest?.(change.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showComments && (
        <div className="mt-3 pt-3 border-t border-border">
          <ChangeComments
            changeId={change.id}
            comments={change.comments}
            isNoteOwner={isOwner}
            currentUserId={currentUserId}
            onRefresh={onRefresh}
            onDeleteRequest={onCommentDeleteRequest}
          />
        </div>
      )}
    </div>
  );
}
