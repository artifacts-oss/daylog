'use client';

import AuthErrorAlert from '@/components/AuthErrorAlert';
import AuthPageShell from '@/components/AuthPageShell';
import AuthSubmitButton from '@/components/AuthSubmitButton';
import FormField from '@/components/FormField';
import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { signin } from '../lib/actions';
import { validateAllowRegistration } from '@/app/register/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { FAST } from '@/lib/motion';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const [state, action, pending] = useActionState(signin, undefined);
  const [isRegAllowed, setIsRegAllowed] = useState(false);
  const t = useTranslations('LoginPage');

  useEffect(() => {
    validateAllowRegistration().then((allowReg) => {
      setIsRegAllowed(allowReg);
    });
  }, []);

  return (
    <AuthPageShell tagline={t('tagline')}>
      <AnimatePresence mode="wait">
        {state?.message && (
          <AuthErrorAlert
            key="error"
            title={t('errorTitle')}
            message={state.message}
          />
        )}
      </AnimatePresence>

      <Card className="glass-card border-border/50 shadow-xl backdrop-blur-md bg-card/70 ring-1 ring-white/10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {t('title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </CardHeader>
        <CardContent>
          <form
            action={action}
            autoComplete="off"
            noValidate
            className="space-y-4"
          >
            <FormField
              label={t('emailLabel')}
              name="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              defaultValue={state?.data?.email?.toString()}
              errors={state?.errors?.email}
              autoComplete="off"
              className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
            />
            <div className="space-y-1">
              <FormField
                label={t('passwordLabel')}
                name="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                defaultValue={state?.data?.password?.toString()}
                errors={state?.errors?.password}
                autoComplete="off"
                className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
              />
              <div className="flex justify-end">
                <Link
                  href="/login/reset"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('forgotPassword')}
                </Link>
              </div>
            </div>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <AuthSubmitButton
              pending={pending}
              pendingLabel={t('submitting')}
              label={t('submit')}
            />
          </form>
        </CardContent>
      </Card>

      {isRegAllowed && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={FAST}
          className="text-center text-sm text-muted-foreground"
        >
          {t('signupPrompt')}{' '}
          <Link
            href="/register"
            className="font-semibold text-foreground hover:underline underline-offset-4"
          >
            {t('signup')}
          </Link>
        </motion.p>
      )}
    </AuthPageShell>
  );
}
