'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertOctagon } from 'lucide-react';
import { Label } from '@/components/ui/label';

type DeleteHistoryModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  actionLabel?: string;
  onConfirm: () => void;
  isLoading: boolean;
  variant?: 'danger' | 'primary';
};

export default function DeleteHistoryModal({
  isOpen,
  onOpenChange,
  title = 'Are you sure?',
  description = 'Do you really want to perform this action? This cannot be undone.',
  actionLabel = 'Yes, delete',
  onConfirm,
  isLoading,
  variant = 'danger',
}: DeleteHistoryModalProps) {
  const isDanger = variant === 'danger';

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="p-10 max-w-[480px]">
        <AlertDialogHeader className="mb-6 text-left">
          <Label
            className={
              isDanger ? 'text-[var(--color-text-accent-red)]' : 'text-primary'
            }
          >
            Confirmation Required
          </Label>
          <AlertDialogTitle className="flex items-center gap-2">
            {title}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-8">
          <p className="text-sm text-muted-foreground leading-relaxed antialiased">
            {description}
          </p>

          <div
            className={`p-4 rounded-[12px] border ${
              isDanger
                ? 'bg-[var(--color-accent-red)] border-transparent'
                : 'bg-primary/5 border-primary/20'
            }`}
          >
            <p
              className={`text-[12px] font-medium leading-normal flex gap-2 ${
                isDanger
                  ? 'text-[var(--color-text-accent-red)]'
                  : 'text-primary'
              }`}
            >
              <AlertOctagon className="h-4 w-4 flex-shrink-0" />
              {isDanger
                ? 'Warning: This action is permanent and will permanently remove this data.'
                : 'Note: You are about to restore the note content. Current unsaved changes might be overwritten.'}
            </p>
          </div>
        </div>

        <AlertDialogFooter className="mt-8">
          <AlertDialogCancel
            disabled={isLoading}
            className="rounded-[12px] text-muted-foreground font-bold hover:bg-secondary/10 border-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className={`font-bold px-8 shadow-none border-0 ${
              isDanger
                ? 'bg-[var(--color-accent-red)] text-[var(--color-text-accent-red)] hover:opacity-80'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            disabled={isLoading}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isLoading ? 'Processing...' : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
