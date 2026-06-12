'use client';

import Image from 'next/image';
import Link from 'next/link';
import { use, useActionState } from 'react';
import { setPassword } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { KeyIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

export default function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, action, pending] = useActionState(setPassword, undefined);
  const t = useTranslations('ResetPage');

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 10% 10%, hsl(var(--color-primary) / 0.03) 0%, transparent 40%),
          radial-gradient(circle at 90% 90%, hsl(var(--color-primary) / 0.02) 0%, transparent 40%),
          var(--color-background)
        `,
      }}
    >
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <Image
            src="/daylog.svg"
            width="0"
            height="0"
            alt="daylog"
            priority={true}
            className="mx-auto logo-invert"
            style={{ width: 'auto', height: '48px' }}
          />
        </div>

        {state?.success && (
          <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
            <CheckCircleIcon className="h-4 w-4" />
            <AlertTitle>{t('setPasswordSuccess')}</AlertTitle>
            <AlertDescription>
              {t('setPasswordSuccessDescription')}
            </AlertDescription>
            <Button variant="outline" className="mt-2" asChild>
              <Link href="/login">{t('goToLogin')}</Link>
            </Button>
          </Alert>
        )}

        {state?.message && !state?.success && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>{t('tokenErrorTitle')}</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {!state?.success && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>{t('setPasswordTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t('setPasswordDescription')}
              </p>
              <form
                action={action}
                autoComplete="off"
                noValidate
                className="space-y-2"
              >
                <input type="hidden" name="token" value={token} />

                <div className="space-y-2 relative pb-5">
                  <Label htmlFor="password">{t('passwordLabel')}</Label>
                  <Input
                    type="password"
                    name="password"
                    id="password"
                    placeholder={t('passwordPlaceholder')}
                    className={
                      state?.errors?.password ? 'border-destructive' : ''
                    }
                  />
                  {state?.errors?.password && (
                    <p className="text-[12px] text-destructive absolute bottom-0 left-0">
                      {state.errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2 relative pb-5">
                  <Label htmlFor="confirmPassword">
                    {t('confirmPasswordLabel')}
                  </Label>
                  <Input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    placeholder={t('confirmPasswordPlaceholder')}
                    className={
                      state?.errors?.confirmPassword
                        ? 'border-destructive'
                        : ''
                    }
                  />
                  {state?.errors?.confirmPassword && (
                    <p className="text-[12px] text-destructive absolute bottom-0 left-0">
                      {state.errors.confirmPassword}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={pending}>
                  <KeyIcon className="h-4 w-4 mr-2" />
                  {pending ? t('setPasswordSubmitting') : t('setPasswordSubmit')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-muted-foreground">
          {t('backPrefix')}{' '}
          <Link href="/login" className="text-foreground hover:underline">
            {t('backLink')}
          </Link>{' '}
          {t('backSuffix')}
        </p>
      </div>
    </div>
  );
}
