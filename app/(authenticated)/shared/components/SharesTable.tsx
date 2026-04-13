'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  TrashIcon,
  LinkIcon,
  CheckIcon,
  ArrowTopRightOnSquareIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { deleteShare, updateSharePassword } from '../lib/actions';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SharedContent } from '../lib/types';

export default function SharesTable({ shares }: { shares: SharedContent[] }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editingPassword, setEditingPassword] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(confirmDelete.id);
    try {
      await deleteShare(confirmDelete.id);
      setConfirmDelete(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete share:', error);
      alert('Failed to revoke link. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdatePassword = async () => {
    if (!editingPassword) return;
    setIsUpdating(true);
    try {
      await updateSharePassword(editingPassword.id, newPassword || null);
      setEditingPassword(null);
      setNewPassword('');
      router.refresh();
    } catch (error) {
      console.error('Failed to update password:', error);
      alert('Failed to update password. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-[20px] border border-border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[300px] font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              Entity
            </TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              Config
            </TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              Unique Readers (W/M/Total)
            </TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              Created
            </TableHead>
            <TableHead className="text-right font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-48 text-center text-muted-foreground"
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <LinkIcon className="h-8 w-8 opacity-20" />
                  <p className="font-medium text-sm">No shared content yet</p>
                  <p className="text-[12px] opacity-60">
                    Share a note or board to see it here.
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            shares.map((share) => (
              <TableRow
                key={share.id}
                className="hover:bg-muted/30 transition-colors group"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${
                        share.entityType === 'NOTE'
                          ? 'bg-orange-50 border-orange-100/50 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/20'
                          : 'bg-blue-50 border-blue-100/50 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20'
                      }`}
                    >
                      {share.entityType === 'NOTE' ? (
                        <DocumentTextIcon className="h-5 w-5" />
                      ) : (
                        <Squares2X2Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[15px] text-foreground tracking-tight truncate max-w-[200px]">
                        {share.title}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        {share.entityType === 'NOTE'
                          ? 'Shared Note'
                          : 'Public Board'}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {share.hasPassword && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 bg-fuchsia-500/10 px-2 py-0.5 rounded-md">
                        Password
                      </span>
                    )}
                    {share.expiresAt && (
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          new Date(share.expiresAt) < new Date()
                            ? 'text-rose-500 bg-rose-500/10'
                            : 'text-amber-500 bg-amber-500/10'
                        }`}
                      >
                        {new Date(share.expiresAt) < new Date()
                          ? 'Expired'
                          : 'Expires'}
                      </span>
                    )}
                    {share.oneTime && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        One-Time
                      </span>
                    )}
                    {!share.hasPassword &&
                      !share.expiresAt &&
                      !share.oneTime && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          Public
                        </span>
                      )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 items-baseline font-mono">
                    <span className="text-[14px] font-bold text-foreground">
                      {share.metrics.weekly}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">
                      /
                    </span>
                    <span className="text-[14px] font-medium text-muted-foreground">
                      {share.metrics.monthly}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">
                      /
                    </span>
                    <span className="text-[14px] font-bold text-primary">
                      {share.metrics.total}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground">
                  {new Date(share.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    {/* Hide password option for expired links */}
                    {!(
                      share.expiresAt && new Date(share.expiresAt) < new Date()
                    ) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setEditingPassword({
                            id: share.id,
                            title: share.title,
                          })
                        }
                        className={`h-9 w-9 rounded-xl transition-all ${share.hasPassword ? 'text-fuchsia-500 hover:bg-fuchsia-500/10' : 'hover:bg-primary/10 hover:text-primary'}`}
                        title={
                          share.hasPassword
                            ? 'Update password'
                            : 'Add password protection'
                        }
                      >
                        <KeyIcon className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyLink(share.id)}
                      className={`h-9 w-9 rounded-xl transition-all ${
                        copiedId === share.id
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'hover:bg-primary/10 hover:text-primary'
                      }`}
                      title="Copy share link"
                    >
                      {copiedId === share.id ? (
                        <CheckIcon className="h-4 w-4" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="h-9 w-9 rounded-xl hover:bg-accent hover:text-foreground transition-all"
                      title="Open shared page"
                    >
                      <a
                        href={`/share/${share.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setConfirmDelete({ id: share.id, title: share.title })
                      }
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                      title="Revoke link"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmDelete}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent className="p-10 max-w-[480px] rounded-[32px] border border-border shadow-2xl">
          <DialogHeader className="mb-6">
            <span className="text-[12px] font-bold uppercase tracking-widest text-rose-500 mb-1 block">
              Security Verification
            </span>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
              Revoke Share Link
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
            <p className="text-sm text-muted-foreground leading-relaxed antialiased font-medium">
              Are you sure you want to revoke the link for{' '}
              <strong className="text-rose-500 font-bold">
                {confirmDelete?.title}
              </strong>
              ? This action will immediately stop all future access.
            </p>

            <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-rose-500/20">
              <p className="text-[12px] text-rose-500 font-bold leading-normal flex gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                Warning: Revoking this link will permanently disable public
                access to this{' '}
                {confirmDelete?.title.includes('Board') ? 'board' : 'content'}.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-8">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
              className="rounded-[12px] text-muted-foreground font-bold hover:bg-secondary/10"
              disabled={!!isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={!!isDeleting}
              className="font-bold px-8 shadow-none"
            >
              {isDeleting ? 'Revoking...' : 'Confirm Revoke'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog
        open={!!editingPassword}
        onOpenChange={(open) => !open && setEditingPassword(null)}
      >
        <DialogContent className="max-w-md rounded-[24px] border border-border mt-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              Update Protection
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-1">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Target Link
              </p>
              <p className="font-bold text-foreground">
                {editingPassword?.title}
              </p>
            </div>
            <div className="space-y-1.5 pt-2">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60">
                New Password
              </p>
              <Input
                type="text"
                placeholder="Leave empty to make public..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="font-medium"
              />
              <p className="text-[11px] text-muted-foreground italic">
                Setting a new password will invalidate the previous one
                immediately.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setEditingPassword(null)}
              className="rounded-xl font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdating}
              className="rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90"
            >
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
