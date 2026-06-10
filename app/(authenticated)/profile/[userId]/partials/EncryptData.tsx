'use client';

import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';
import { AlertOctagon } from 'lucide-react';
import { useActionState, useState } from 'react';
import {
  disableEncryption,
  enableEncryption,
  recoverEncryptedData,
  wipeEncryptedData,
  type SafeProfile,
} from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';

type Props = { profile: SafeProfile; masterKeyConfigured?: boolean };

export default function EncryptData({ profile, masterKeyConfigured = false }: Props) {
  const t = useTranslations('EncryptData');

  if (profile.encryptedDataLocked) {
    return <LockedBanner profile={profile} />;
  }

  return (
    <Card className="mt-4 rounded-[20px] bg-card shadow-none">
      <CardHeader>
        <Label>{t('sectionLabel')}</Label>
        <CardTitle className="flex items-center gap-3">
          {t('title')}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
              profile.encryptionEnabled
                ? 'bg-primary/10 text-primary'
                : 'bg-secondary/30 text-muted-foreground'
            }`}
          >
            {profile.encryptionEnabled ? t('enabledBadge') : t('disabledBadge')}
          </span>
        </CardTitle>
        <p className="text-sm text-muted-foreground font-medium">{t('description')}</p>
      </CardHeader>
      <CardContent>
        {!masterKeyConfigured ? (
          <div className="p-4 bg-secondary/20 rounded-[12px] border border-border">
            <p className="text-[13px] text-muted-foreground font-medium leading-relaxed flex gap-2">
              <AlertOctagon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {t('notConfiguredDescription')}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            {profile.encryptionEnabled ? (
              <DisableModal profile={profile} />
            ) : (
              <EnableModal profile={profile} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const EnableModal = ({ profile }: Props) => {
  const t = useTranslations('EncryptData');
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(enableEncryption, undefined);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="rounded-[12px] bg-primary font-bold h-[44px] px-6 transition-all hover:scale-[1.02] active:scale-95 shadow-none"
      >
        <LockClosedIcon className="h-4 w-4 mr-2" />
        {t('enableButton')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-10 max-w-[480px]">
          <DialogHeader className="mb-6">
            <Label>{t('sectionLabel')}</Label>
            <DialogTitle>{t('enableTitle')}</DialogTitle>
          </DialogHeader>
          <form action={action}>
            <input type="hidden" name="userId" value={profile.id} />
            {!state?.success ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('enableDescription')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="enc-enable-password">{t('passwordLabel')}</Label>
                  <Input
                    id="enc-enable-password"
                    name="password"
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    className="h-[48px] rounded-[12px]"
                    required
                  />
                  {state?.errors?.password && (
                    <p className="text-[12px] font-bold text-accent-red mt-1">
                      {state.errors.password}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-destructive/20">
                  <p className="text-[12px] text-destructive font-medium leading-normal flex gap-2">
                    <AlertOctagon className="h-4 w-4 flex-shrink-0" />
                    {t('enableWarning')}
                  </p>
                </div>
                {state?.message && !state.success && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs font-bold">{state.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
                <CheckCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold">{state.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="mt-8 gap-3 sm:gap-2">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="font-bold">
                {state?.success ? t('goBack') : t('cancel')}
              </Button>
              {!state?.success && (
                <Button type="submit" disabled={pending} className="font-bold px-8 shadow-none">
                  {pending ? t('enabling') : t('confirmEnable')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DisableModal = ({ profile }: Props) => {
  const t = useTranslations('EncryptData');
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(disableEncryption, undefined);

  return (
    <>
      <Button
        variant="danger"
        onClick={() => setOpen(true)}
        className="rounded-[12px] font-bold h-[44px] px-6 transition-all hover:scale-[1.02] active:scale-95 shadow-none"
      >
        <LockOpenIcon className="h-4 w-4 mr-2" />
        {t('disableButton')}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-10 max-w-[480px]">
          <DialogHeader className="mb-6">
            <Label className="text-destructive">{t('sectionLabel')}</Label>
            <DialogTitle>{t('disableTitle')}</DialogTitle>
          </DialogHeader>
          <form action={action}>
            <input type="hidden" name="userId" value={profile.id} />
            {!state?.success ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('disableDescription')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="enc-disable-password">{t('passwordLabel')}</Label>
                  <Input
                    id="enc-disable-password"
                    name="password"
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    className="h-[48px] rounded-[12px]"
                    required
                  />
                  {state?.errors?.password && (
                    <p className="text-[12px] font-bold text-accent-red mt-1">
                      {state.errors.password}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-destructive/20">
                  <p className="text-[12px] text-destructive font-medium leading-normal flex gap-2">
                    <AlertOctagon className="h-4 w-4 flex-shrink-0" />
                    {t('disableWarning')}
                  </p>
                </div>
                {state?.message && !state.success && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs font-bold">{state.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
                <CheckCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold">{state.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="mt-8 gap-3 sm:gap-2">
              <Button variant="ghost" type="button" onClick={() => setOpen(false)} className="font-bold">
                {state?.success ? t('goBack') : t('cancel')}
              </Button>
              {!state?.success && (
                <Button variant="danger" type="submit" disabled={pending} className="font-bold px-8 shadow-none">
                  {pending ? t('disabling') : t('confirmDisable')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const LockedBanner = ({ profile }: Props) => {
  const t = useTranslations('EncryptData');
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [recoverState, recoverAction, recoverPending] = useActionState(recoverEncryptedData, undefined);
  const [wipeState, wipeAction, wipePending] = useActionState(wipeEncryptedData, undefined);

  return (
    <Card className="mt-4 rounded-[20px] bg-card shadow-none">
      <CardHeader>
        <Label>{t('sectionLabel')}</Label>
        <CardTitle className="flex items-center gap-3">
          {t('title')}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-destructive/10 text-destructive">
            Locked
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-destructive/20 mb-4">
          <p className="text-[13px] text-destructive font-medium leading-relaxed flex gap-2">
            <AlertOctagon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {t('lockedDescription')}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={() => setRecoverOpen(true)}
            className="rounded-[12px] font-bold h-[44px] px-6 shadow-none"
          >
            <LockClosedIcon className="h-4 w-4 mr-2" />
            {t('recoverButton')}
          </Button>
          <Button
            variant="danger"
            onClick={() => setWipeOpen(true)}
            className="rounded-[12px] font-bold h-[44px] px-6 shadow-none"
          >
            {t('wipeButton')}
          </Button>
        </div>
      </CardContent>

      {/* Recover dialog */}
      <Dialog open={recoverOpen} onOpenChange={setRecoverOpen}>
        <DialogContent className="p-10 max-w-[480px]">
          <DialogHeader className="mb-6">
            <Label>{t('sectionLabel')}</Label>
            <DialogTitle>{t('recoverTitle')}</DialogTitle>
          </DialogHeader>
          <form action={recoverAction}>
            <input type="hidden" name="userId" value={profile.id} />
            {!recoverState?.success ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('recoverDescription')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="old-password">{t('oldPasswordLabel')}</Label>
                  <Input
                    id="old-password"
                    name="oldPassword"
                    type="password"
                    placeholder={t('oldPasswordPlaceholder')}
                    className="h-[48px] rounded-[12px]"
                    required
                  />
                  {recoverState?.errors?.oldPassword && (
                    <p className="text-[12px] font-bold text-accent-red mt-1">
                      {recoverState.errors.oldPassword}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password-recover">{t('passwordLabel')}</Label>
                  <Input
                    id="new-password-recover"
                    name="newPassword"
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    className="h-[48px] rounded-[12px]"
                    required
                  />
                  {recoverState?.errors?.newPassword && (
                    <p className="text-[12px] font-bold text-accent-red mt-1">
                      {recoverState.errors.newPassword}
                    </p>
                  )}
                </div>
                {recoverState?.message && !recoverState.success && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs font-bold">{recoverState.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
                <CheckCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold">{recoverState.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="mt-8 gap-3 sm:gap-2">
              <Button variant="ghost" type="button" onClick={() => setRecoverOpen(false)} className="font-bold">
                {recoverState?.success ? t('goBack') : t('cancel')}
              </Button>
              {!recoverState?.success && (
                <Button type="submit" disabled={recoverPending} className="font-bold px-8 shadow-none">
                  {recoverPending ? t('recovering') : t('confirmRecover')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Wipe dialog */}
      <Dialog open={wipeOpen} onOpenChange={setWipeOpen}>
        <DialogContent className="p-10 max-w-[480px]">
          <DialogHeader className="mb-6">
            <Label className="text-destructive">{t('sectionLabel')}</Label>
            <DialogTitle>{t('wipeTitle')}</DialogTitle>
          </DialogHeader>
          <form action={wipeAction}>
            <input type="hidden" name="userId" value={profile.id} />
            {!wipeState?.success ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{t('wipeDescription')}</p>
                {wipeState?.message && !wipeState.success && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs font-bold">{wipeState.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
                <CheckCircleIcon className="h-4 w-4" />
                <AlertDescription className="font-bold">{wipeState.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter className="mt-8 gap-3 sm:gap-2">
              <Button variant="ghost" type="button" onClick={() => setWipeOpen(false)} className="font-bold">
                {wipeState?.success ? t('goBack') : t('cancel')}
              </Button>
              {!wipeState?.success && (
                <Button variant="danger" type="submit" disabled={wipePending} className="font-bold px-8 shadow-none">
                  {wipePending ? t('wiping') : t('confirmWipe')}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
