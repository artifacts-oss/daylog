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
  DocumentTextIcon,
  Squares2X2Icon,
  UsersIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { deleteShare, updateSharePassword } from '../lib/actions';
import UpdateSnapshotButton from '@/components/UpdateSnapshotButton';
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
import { Label } from '@/components/ui/label';
import { AlertOctagon } from 'lucide-react';
import { SharedContent } from '../lib/types';
import { useLocale, useTranslations } from 'next-intl';

export default function SharesTable({ shares }: { shares: SharedContent[] }) {
  const t = useTranslations('SharedTable');
  const locale = useLocale();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    title: string;
    entityType: SharedContent['entityType'];
  } | null>(null);
  const [editingPassword, setEditingPassword] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [viewingRecipients, setViewingRecipients] = useState<SharedContent | null>(null);
  const [viewingMetrics, setViewingMetrics] = useState<SharedContent | null>(null);
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
      alert(t('errors.revoke'));
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
      alert(t('errors.password'));
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

  const isPublic = (share: SharedContent) => share.scope === 'PUBLIC';

  return (
    <div className="rounded-[20px] border border-border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[300px] font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              {t('headers.entity')}
            </TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              {t('headers.config')}
            </TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              {t('headers.created')}
            </TableHead>
            <TableHead className="text-right font-bold text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
              {t('headers.actions')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <LinkIcon className="h-8 w-8 opacity-20" />
                  <p className="font-medium text-sm">{t('empty.title')}</p>
                  <p className="text-[12px] opacity-60">{t('empty.description')}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            shares.map((share) => (
              <TableRow key={share.id} className="hover:bg-muted/30 transition-colors group">
                {/* Entity */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${
                      share.entityType === 'NOTE'
                        ? 'bg-orange-50 border-orange-100/50 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/20'
                        : 'bg-blue-50 border-blue-100/50 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20'
                    }`}>
                      {share.entityType === 'NOTE'
                        ? <DocumentTextIcon className="h-5 w-5" />
                        : <Squares2X2Icon className="h-5 w-5" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[15px] text-foreground tracking-tight truncate max-w-[200px]">
                        {share.title}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        {share.entityType === 'NOTE'
                          ? isPublic(share) ? t('types.publicNote') : t('types.sharedNote')
                          : isPublic(share) ? t('types.publicBoard') : t('types.sharedBoard')}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Config badges */}
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Scope badge */}
                    {share.scope === 'ALL' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-500 bg-violet-500/10 px-2 py-0.5 rounded-md">
                        <GlobeAltIcon className="h-3 w-3" />
                        {t('badges.server')}
                      </span>
                    )}
                    {share.scope === 'SPECIFIC' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded-md">
                        <UsersIcon className="h-3 w-3" />
                        {t('badges.specific')}
                        {share.recipients.length > 0 && (
                          <span className="ml-0.5 opacity-70">({share.recipients.length})</span>
                        )}
                      </span>
                    )}
                    {share.canEdit && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
                        <PencilSquareIcon className="h-3 w-3" />
                        {t('badges.canEdit')}
                      </span>
                    )}
                    {/* Public-only badges */}
                    {isPublic(share) && share.hasPassword && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500 bg-fuchsia-500/10 px-2 py-0.5 rounded-md">
                        {t('badges.password')}
                      </span>
                    )}
                    {isPublic(share) && share.expiresAt && (
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                        new Date(share.expiresAt) < new Date()
                          ? 'text-rose-500 bg-rose-500/10'
                          : 'text-amber-500 bg-amber-500/10'
                      }`}>
                        {new Date(share.expiresAt) < new Date() ? t('badges.expired') : t('badges.expires')}
                      </span>
                    )}
                    {isPublic(share) && share.oneTime && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                        {t('badges.oneTime')}
                      </span>
                    )}
                    {isPublic(share) && !share.hasPassword && !share.expiresAt && !share.oneTime && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        {t('badges.public')}
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Date */}
                <TableCell className="text-[13px] text-muted-foreground">
                  {new Date(share.createdAt).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <UpdateSnapshotButton
                      shareId={share.id}
                      snapshotUpdatedAt={share.snapshotUpdatedAt}
                      variant="table"
                    />

                    {/* Metrics button — only for PUBLIC */}
                    {isPublic(share) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingMetrics(share)}
                        className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                        title={t('actions.viewMetrics')}
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Recipients button — only for ALL and SPECIFIC */}
                    {!isPublic(share) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewingRecipients(share)}
                        className="h-9 w-9 rounded-xl hover:bg-violet-500/10 hover:text-violet-500 transition-all"
                        title={t('actions.viewRecipients')}
                      >
                        <UsersIcon className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Password — only for PUBLIC, hide if expired */}
                    {isPublic(share) && !(share.expiresAt && new Date(share.expiresAt) < new Date()) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPassword({ id: share.id, title: share.title })}
                        className={`h-9 w-9 rounded-xl transition-all ${share.hasPassword ? 'text-fuchsia-500 hover:bg-fuchsia-500/10' : 'hover:bg-primary/10 hover:text-primary'}`}
                        title={share.hasPassword ? t('actions.updatePassword') : t('actions.addPassword')}
                      >
                        <KeyIcon className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Copy link — only for PUBLIC */}
                    {isPublic(share) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyLink(share.id)}
                        className={`h-9 w-9 rounded-xl transition-all ${
                          copiedId === share.id
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'hover:bg-primary/10 hover:text-primary'
                        }`}
                        title={copiedId === share.id ? t('actions.copiedLink') : t('actions.copyLink')}
                      >
                        {copiedId === share.id
                          ? <CheckIcon className="h-4 w-4" />
                          : <LinkIcon className="h-4 w-4" />}
                      </Button>
                    )}

                    {/* Open page — only for PUBLIC */}
                    {isPublic(share) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="h-9 w-9 rounded-xl hover:bg-accent hover:text-foreground transition-all"
                        title={t('actions.openPage')}
                      >
                        <a href={`/share/${share.id}`} target="_blank" rel="noopener noreferrer">
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                      </Button>
                    )}

                    {/* Delete — always visible */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDelete({ id: share.id, title: share.title, entityType: share.entityType })}
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-transparent hover:border-rose-500/20"
                      title={t('actions.revoke')}
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

      {/* Metrics Dialog */}
      <Dialog open={!!viewingMetrics} onOpenChange={(open) => !open && setViewingMetrics(null)}>
        <DialogContent className="max-w-sm rounded-[24px] border border-border">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-black tracking-tight">
              {t('metricsDialog.title')}
            </DialogTitle>
            <p className="text-sm font-bold text-foreground truncate">{viewingMetrics?.title}</p>
          </DialogHeader>
          <div className="py-2 flex flex-col gap-3">
            {[
              { label: t('metricsDialog.weekly'),  value: viewingMetrics?.metrics.weekly,  color: 'text-foreground' },
              { label: t('metricsDialog.monthly'), value: viewingMetrics?.metrics.monthly, color: 'text-muted-foreground' },
              { label: t('metricsDialog.total'),   value: viewingMetrics?.metrics.total,   color: 'text-primary' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/40 border border-border">
                <span className="text-sm font-bold text-muted-foreground">{label}</span>
                <span className={`text-2xl font-black font-mono ${color}`}>{value ?? 0}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipients Dialog */}
      <Dialog open={!!viewingRecipients} onOpenChange={(open) => !open && setViewingRecipients(null)}>
        <DialogContent className="max-w-sm rounded-[24px] border border-border">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-black tracking-tight">
              {t('recipientsDialog.title')}
            </DialogTitle>
            <p className="text-sm font-bold text-foreground truncate">{viewingRecipients?.title}</p>
          </DialogHeader>

          <div className="py-2">
            {viewingRecipients?.scope === 'ALL' ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                  <GlobeAltIcon className="h-6 w-6 text-violet-500" />
                </div>
                <div>
                  <p className="font-black text-sm text-foreground">{t('recipientsDialog.allMembers')}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 max-w-[220px]">
                    {t('recipientsDialog.allMembersDesc')}
                  </p>
                </div>
              </div>
            ) : viewingRecipients?.recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t('recipientsDialog.noRecipients')}</p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {viewingRecipients?.recipients.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-[11px] font-black text-muted-foreground">
                      {(r.name || r.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{r.name || r.email}</p>
                      {r.name && <p className="text-[11px] text-muted-foreground truncate">{r.email}</p>}
                    </div>
                    {viewingRecipients.canEdit && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md shrink-0">
                        <PencilSquareIcon className="h-3 w-3" />
                        {t('recipientsDialog.canEdit')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="p-10 max-w-[480px]">
          <DialogHeader className="mb-6">
            <Label className="text-destructive">{t('revokeDialog.security')}</Label>
            <DialogTitle>{t('revokeDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-8">
            <p className="text-sm text-muted-foreground leading-relaxed antialiased">
              {t('revokeDialog.description', { title: confirmDelete?.title ?? '' })}
            </p>
            <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-destructive/20">
              <p className="text-[12px] text-destructive font-medium leading-normal flex gap-2">
                <AlertOctagon className="h-4 w-4 flex-shrink-0" />
                {t('revokeDialog.warning', {
                  target: confirmDelete?.entityType === 'BOARD' ? t('targets.board') : t('targets.content'),
                })}
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
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={!!isDeleting}
              className="font-bold px-8 shadow-none"
            >
              {isDeleting ? t('revokeDialog.revoking') : t('revokeDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={!!editingPassword} onOpenChange={(open) => !open && setEditingPassword(null)}>
        <DialogContent className="max-w-md rounded-[24px] border border-border mt-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">
              {t('passwordDialog.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-1">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {t('passwordDialog.targetLink')}
              </p>
              <p className="font-bold text-foreground">{editingPassword?.title}</p>
            </div>
            <div className="space-y-1.5 pt-2">
              <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {t('passwordDialog.newPassword')}
              </p>
              <Input
                type="text"
                placeholder={t('passwordDialog.placeholder')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="font-medium"
              />
              <p className="text-[11px] text-muted-foreground italic">{t('passwordDialog.help')}</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setEditingPassword(null)} className="rounded-xl font-bold">
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={isUpdating}
              className="rounded-xl font-bold bg-primary text-primary-foreground hover:opacity-90"
            >
              {isUpdating ? t('common.updating') : t('common.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
