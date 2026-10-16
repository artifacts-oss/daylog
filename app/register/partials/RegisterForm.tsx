'use client';

import AuthErrorAlert from '@/components/AuthErrorAlert';
import AuthPageShell from '@/components/AuthPageShell';
import AuthSubmitButton from '@/components/AuthSubmitButton';
import FormField from '@/components/FormField';
import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { signup } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { FAST } from '@/lib/motion';

export default function RegisterForm() {
  const [state, action, pending] = useActionState(signup, undefined);
  const t = useTranslations('RegisterPage');

  return (
    <AuthPageShell tagline={t('tagline')} mirrored>
      <AnimatePresence mode="wait">
        {state?.message && (
          <AuthErrorAlert
            key="error"
            title={t('errorTitle')}
            message={state.message}
          />
        )}

        {state?.success && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Alert className="border-green-500/20 bg-green-500/5 text-green-500 backdrop-blur-sm">
              <CheckCircleIcon className="h-4 w-4" />
              <AlertTitle className="font-bold">{t('successTitle')}</AlertTitle>
              <AlertDescription>
                {t('successDescription')}
              </AlertDescription>
              <Button
                variant="outline"
                className="mt-4 w-full border-green-500/30 hover:bg-green-500/20"
                asChild
              >
                <Link href="/login">{t('goToLogin')}</Link>
              </Button>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {!state?.success && (
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
            <form action={action} autoComplete="off" className="space-y-4">
              <FormField
                label={t('nameLabel')}
                name="name"
                placeholder={t('namePlaceholder')}
                defaultValue={state?.data?.name?.toString()}
                errors={state?.errors?.name}
                className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
              />
              <FormField
                label={t('emailLabel')}
                name="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                defaultValue={state?.data?.email?.toString()}
                errors={state?.errors?.email}
                className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
              />
              <FormField
                label={t('passwordLabel')}
                name="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                defaultValue={state?.data?.password?.toString()}
                errors={state?.errors?.password}
                className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
              />
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-2">
                  <input
                    name="terms"
                    type="checkbox"
                    id="terms"
                    defaultChecked={state?.data?.terms?.toString() === 'on'}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-xs m-0 font-medium text-muted-foreground leading-none"
                  >
                    {t('termsPrefix')}{' '}
                    <Link
                      href="/register/terms"
                      className="text-foreground hover:underline underline-offset-2"
                    >
                      {t('termsLink')}
                    </Link>
                  </Label>
                </div>
                {state?.errors?.terms && (
                  <p className="text-[11px] font-medium text-destructive ml-6">
                    {state?.errors?.terms}
                  </p>
                )}
              </div>
              <AuthSubmitButton
                pending={pending}
                pendingLabel={t('submitting')}
                label={t('submit')}
              />
            </form>
          </CardContent>
        </Card>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={FAST}
        className="text-center text-sm text-muted-foreground"
      >
        {t('signinPrompt')}{' '}
        <Link
          href="/login"
          className="font-semibold text-foreground hover:underline underline-offset-4"
        >
          {t('signin')}
        </Link>
      </motion.p>
    </AuthPageShell>
  );
}
