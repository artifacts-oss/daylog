'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useActionState } from 'react';
import { signupInit } from '../lib/actions';
import Link from 'next/link';
import FormField from '@/components/FormField';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PasswordInput from '@/components/PasswordInput';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Renders initial admin registration with validation errors and signup feedback.
 */
export default function InitRegisterForm() {
  const t = useTranslations('InitRegisterPage');
  const [state, action, pending] = useActionState(signupInit, undefined);
  const passwordErrors = state?.errors?.password;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 90% 10%, hsl(var(--color-primary) / 0.03) 0%, transparent 40%),
          radial-gradient(circle at 10% 90%, hsl(var(--color-primary) / 0.02) 0%, transparent 40%),
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

        {state?.message && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state?.success && (
          <Alert className="border-green-500 text-green-500">
            <CheckCircleIcon className="h-4 w-4" />
            <AlertTitle>{t('successTitle')}</AlertTitle>
            <AlertDescription>{t('successDescription')}</AlertDescription>
            <Button asChild className="mt-2">
              <Link href="/login">{t('goToLogin')}</Link>
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t('title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} autoComplete="off" className="space-y-2">
              <FormField
                label={t('nameLabel')}
                name="name"
                placeholder={t('namePlaceholder')}
                defaultValue={state?.data?.name?.toString()}
                errors={state?.errors?.name}
              />
              <FormField
                label={t('emailLabel')}
                name="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                defaultValue={state?.data?.email?.toString()}
                errors={state?.errors?.email}
              />
              <div className="space-y-1">
                <Label htmlFor="password">{t('passwordLabel')}</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  defaultValue={state?.data?.password?.toString()}
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="off"
                  className={passwordErrors ? 'border-destructive' : ''}
                />
                {passwordErrors && (
                  <div className="space-y-0.5">
                    {passwordErrors.map((err, i) => (
                      <p key={i} className="text-[12px] text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('termsPrefix')}{' '}
                <Link
                  href="/register/terms"
                  className="text-primary hover:underline"
                >
                  {t('termsLink')}
                </Link>
                {t('termsSuffix')}
              </p>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? t('submitting') : t('submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
