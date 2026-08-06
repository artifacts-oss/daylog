'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShareIcon,
  LockClosedIcon,
  ClockIcon,
  EyeIcon,
  CheckIcon,
  ClipboardIcon,
  GlobeAltIcon,
  UsersIcon,
  LinkIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { createShare, getShareableUsers } from '@/app/(authenticated)/shared/lib/actions';
import { useTranslations } from 'next-intl';
import UserAvatar from '@/components/UserAvatar';

interface ShareDialogProps {
  entityType: 'NOTE' | 'BOARD';
  entityId: number;
  trigger?: React.ReactNode;
}

type ShareScope = 'PUBLIC' | 'ALL' | 'SPECIFIC';

interface ShareableUser {
  id: number;
  name: string | null;
  email: string;
  profileImage: string | null;
}

export default function ShareDialog({ entityType, entityId, trigger }: ShareDialogProps) {
  const t = useTranslations('ShareDialog');
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<ShareScope>('PUBLIC');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [oneTime, setOneTime] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareScope, setShareScope] = useState<ShareScope | null>(null);
  const [copied, setCopied] = useState(false);
  const [users, setUsers] = useState<ShareableUser[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (scope === 'SPECIFIC' && users.length === 0) {
      setLoadingUsers(true);
      getShareableUsers().then((result) => {
        setUsers(result);
        setLoadingUsers(false);
      });
    }
  }, [scope, users.length]);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const share = await createShare({
        entityType,
        entityId,
        password: scope === 'PUBLIC' ? password || undefined : undefined,
        expiresAt: scope === 'PUBLIC' && expiresAt ? new Date(expiresAt) : null,
        oneTime: scope === 'PUBLIC' ? oneTime : false,
        scope,
        recipientIds: scope === 'SPECIFIC' ? selectedUserIds : undefined,
        canEdit: scope === 'SPECIFIC' && entityType === 'NOTE' ? canEdit : false,
      });
      if (scope === 'PUBLIC') {
        setShareLink(`${window.location.origin}/share/${share.id}`);
      }
      setShareScope(scope);
    } catch (error) {
      console.error('Failed to create share:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setShareLink(null);
    setShareScope(null);
    setPassword('');
    setExpiresAt('');
    setOneTime(false);
    setScope('PUBLIC');
    setSelectedUserIds([]);
    setUserSearch('');
    setCanEdit(false);
  };

  const toggleUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const entityLabel =
    entityType === 'NOTE' ? t('entities.note') : t('entities.board');

  const scopeOptions: { value: ShareScope; label: string; description: string; icon: React.ElementType }[] = [
    { value: 'PUBLIC', label: t('scopePublic'), description: t('scopePublicDesc'), icon: LinkIcon },
    { value: 'ALL', label: t('scopeAll'), description: t('scopeAllDesc'), icon: GlobeAltIcon },
    { value: 'SPECIFIC', label: t('scopeSpecific'), description: t('scopeSpecificDesc'), icon: UsersIcon },
  ];

  const isSuccess = shareScope !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(val) => { if (!val) handleClose(); else setIsOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="h-12 w-12 sm:w-auto px-0 sm:px-4 rounded-xl gap-2 bg-background/50 backdrop-blur-sm border-border hover:bg-muted transition-all shrink-0 font-bold text-[10px] uppercase tracking-widest shadow-sm">
            <ShareIcon className="h-4 w-4 text-foreground/70 shrink-0" />
            <span className="hidden sm:block">{t('trigger')}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-[28px] p-0 overflow-hidden border border-border shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <ShareIcon className="h-5 w-5 text-primary" />
            </div>
            <DialogHeader className="space-y-0.5 text-left">
              <DialogTitle className="text-xl font-black tracking-tight leading-none">
                {t('title', { entity: entityLabel })}
              </DialogTitle>
              <p className="text-sm text-muted-foreground font-medium">
                {t('subtitle')}
              </p>
            </DialogHeader>
          </div>
        </div>

        <div className="px-7 py-6 space-y-6 overflow-y-auto flex-1">
          {!isSuccess ? (
            <>
              {/* Scope selector — vertical radio list */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {t('scopeLabel')}
                </Label>
                <div className="flex flex-col gap-2">
                  {scopeOptions.map((opt) => {
                    const isSelected = scope === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setScope(opt.value)}
                        className={`flex items-center gap-4 p-3.5 rounded-2xl border text-left transition-all duration-150 ${
                          isSelected
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border bg-muted/20 hover:bg-muted/50 hover:border-border'
                        }`}
                      >
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          <opt.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold leading-none mb-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {opt.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-medium leading-snug">
                            {opt.description}
                          </p>
                        </div>
                        <div className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PUBLIC: password, expiry, one-time */}
              {scope === 'PUBLIC' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <LockClosedIcon className="h-3 w-3" />
                        {t('passwordLabel')}
                      </Label>
                      <Input
                        type="password"
                        placeholder={t('passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 rounded-xl border-border bg-muted/30 focus:bg-background transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <ClockIcon className="h-3 w-3" />
                        {t('expirationLabel')}
                      </Label>
                      <Input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className="h-10 rounded-xl border-border bg-muted/30 focus:bg-background transition-all text-sm"
                      />
                    </div>
                  </div>

                  {/* One-time toggle */}
                  <button
                    type="button"
                    onClick={() => setOneTime((v) => !v)}
                    className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-150 ${
                      oneTime
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-border bg-muted/20 hover:bg-muted/50'
                    }`}
                  >
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      oneTime ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      <EyeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-bold leading-none mb-1 ${oneTime ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                        {t('oneTimeTitle')}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-medium">
                        {t('oneTimeDescription')}
                      </p>
                    </div>
                    {/* Pill toggle */}
                    <div className={`relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 ${
                      oneTime ? 'bg-amber-500' : 'bg-muted-foreground/20'
                    }`}>
                      <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                        oneTime ? 'left-6' : 'left-1'
                      }`} />
                    </div>
                  </button>
                </div>
              )}

              {/* SPECIFIC: user picker */}
              {scope === 'SPECIFIC' && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <UsersIcon className="h-3 w-3" />
                    {t('recipientsLabel')}
                  </Label>
                  <Input
                    placeholder={t('recipientsPlaceholder')}
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="h-10 rounded-xl border-border bg-muted/30 focus:bg-background transition-all"
                  />
                  <div className="max-h-44 overflow-y-auto rounded-2xl border border-border divide-y divide-border">
                    {loadingUsers ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">{t('loadingUsers')}</div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">{t('noUsers')}</div>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelected = selectedUserIds.includes(u.id);
                        return (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => toggleUser(u.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                              isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <UserAvatar
                                name={u.name}
                                email={u.email}
                                userId={u.id}
                                profileImage={u.profileImage}
                                className={`h-8 w-8 shrink-0 text-[11px] font-black ${
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-bold leading-none truncate">{u.name || u.email}</p>
                                {u.name && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{u.email}</p>}
                              </div>
                            </div>
                            <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ml-2 ${
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                            }`}>
                              {isSelected && <CheckIcon className="h-3 w-3 text-primary-foreground stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {selectedUserIds.length > 0 && (
                    <p className="text-[11px] text-primary font-bold px-1">
                      {t('selectedCount', { count: selectedUserIds.length })}
                    </p>
                  )}

                  {/* Allow editing — only for notes */}
                  {entityType === 'NOTE' && (
                    <button
                      type="button"
                      onClick={() => setCanEdit((v) => !v)}
                      className={`w-full flex items-center gap-4 p-3.5 rounded-2xl border transition-all duration-150 ${
                        canEdit
                          ? 'border-blue-500/30 bg-blue-500/5'
                          : 'border-border bg-muted/20 hover:bg-muted/50'
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        canEdit ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                      }`}>
                        <PencilSquareIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`text-sm font-bold leading-none mb-1 ${canEdit ? 'text-blue-600 dark:text-blue-400' : 'text-foreground'}`}>
                          {t('canEditTitle')}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {t('canEditDescription')}
                        </p>
                      </div>
                      <div className={`relative h-6 w-11 rounded-full transition-colors duration-200 shrink-0 ${
                        canEdit ? 'bg-blue-500' : 'bg-muted-foreground/20'
                      }`}>
                        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                          canEdit ? 'left-6' : 'left-1'
                        }`} />
                      </div>
                    </button>
                  )}
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={isLoading || (scope === 'SPECIFIC' && selectedUserIds.length === 0)}
                className="w-full h-11 rounded-xl font-bold tracking-tight transition-all"
              >
                {isLoading ? t('generating') : scope === 'PUBLIC' ? t('createLink') : t('share')}
              </Button>
            </>
          ) : (
            /* Success state */
            <div className="space-y-5 animate-in zoom-in-95 duration-300">
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="h-14 w-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <CheckIcon className="h-7 w-7 text-white stroke-[3]" />
                </div>
                <div className="text-center">
                  <p className="text-base font-black text-foreground leading-none mb-1">
                    {shareScope === 'PUBLIC'
                      ? t('successTitle')
                      : shareScope === 'ALL'
                      ? t('successAllTitle')
                      : t('successSpecificTitle')}
                  </p>
                  <p className="text-[12px] text-muted-foreground font-medium">
                    {shareScope === 'PUBLIC'
                      ? t('successDescription')
                      : shareScope === 'ALL'
                      ? t('successAllDescription')
                      : t('successSpecificDescription')}
                  </p>
                </div>
              </div>

              {shareScope === 'PUBLIC' && shareLink && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {t('publicLink')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={shareLink}
                      className="h-11 rounded-xl border-border bg-muted/40 font-mono text-[11px] px-4 text-muted-foreground"
                    />
                    <Button
                      onClick={copyToClipboard}
                      variant={copied ? 'default' : 'outline'}
                      className="h-11 w-11 rounded-xl p-0 shrink-0 transition-all"
                    >
                      {copied ? <CheckIcon className="h-4 w-4 stroke-[3]" /> : <ClipboardIcon className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={handleClose}
                className="w-full h-10 rounded-xl font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                {t('close')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
