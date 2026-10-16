'use client';

import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useActionState } from 'react';
import { updatePassword } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/PasswordInput';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { AlertOctagon } from 'lucide-react';
import { useTranslations } from 'next-intl';

type UpdatePassType = {
  userId: number | null;
  profile: {
    id: number;
    name: string | null;
    email: string | null;
    encryptionEnabled: boolean;
  };
};

/**
 * Renders the profile password change form, requesting the current password
 * when the signed-in user is updating their own profile.
 */
export default function UpdatePass({ userId, profile }: UpdatePassType) {
  const t = useTranslations('UpdatePassword');
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={action}>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
          {profile.encryptionEnabled && (
            <div className="flex items-start gap-2 p-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertOctagon className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">{t('encryptionWarning')}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <input type="hidden" name="id" value={profile.id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.id === userId && (
              <div className="space-y-2 relative pb-4">
                <Label htmlFor="current">{t('currentLabel')}</Label>
                <PasswordInput
                  id="current"
                  name="current"
                  placeholder={t('currentPlaceholder')}
                />
                {state?.errors?.current && (
                  <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                    {state?.errors?.current}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2 relative pb-4">
              <Label htmlFor="password">{t('newLabel')}</Label>
              <PasswordInput
                id="password"
                name="password"
                defaultValue={state?.data?.password?.toString()}
                placeholder={t('newPlaceholder')}
              />
              {state?.errors?.password && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {state?.errors?.password}
                </p>
              )}
            </div>
            <div className="space-y-2 relative pb-4">
              <Label htmlFor="confirm">{t('confirmLabel')}</Label>
              <PasswordInput
                id="confirm"
                name="confirm"
                placeholder={t('confirmPlaceholder')}
              />
              {state?.errors?.confirm && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {state?.errors?.confirm}
                </p>
              )}
            </div>
          </div>
          {!state?.success && state?.message && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          {state?.success && state?.message && (
            <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending}>
            <LockClosedIcon className="h-4 w-4 mr-2" />
            {pending
              ? (profile.encryptionEnabled ? t('updatingWithEncryption') : t('updating'))
              : t('changePassword')}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
