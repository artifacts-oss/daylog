'use client';

import FormField from '@/components/FormField';
import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signin } from '../lib/actions';
import { validateAllowRegistration } from '@/app/register/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';
  const [state, action, pending] = useActionState(signin, undefined);
  const [isRegAllowed, setIsRegAllowed] = useState(false);

  useEffect(() => {
    validateAllowRegistration().then((allowReg) => {
      setIsRegAllowed(allowReg);
    });
  }, []);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 10% 10%, hsl(var(--color-primary) / 0.03) 0%, transparent 40%),
          radial-gradient(circle at 90% 90%, hsl(var(--color-primary) / 0.02) 0%, transparent 40%),
          var(--color-background)
        `,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center"
        >
          <Image
            src="/daylog.svg"
            width="0"
            height="0"
            alt="daylog"
            priority={true}
            className="mx-auto logo-invert drop-shadow-sm"
            style={{ width: 'auto', height: '56px' }}
          />
          <p className="mt-2 text-sm text-muted-foreground font-medium tracking-wide uppercase">
            Your thoughts, organized and secure
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {state?.message && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
            >
              <Alert variant="destructive" className="glass-card">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Could not login</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="glass-card border-border/50 shadow-xl backdrop-blur-md bg-card/70 ring-1 ring-white/10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold tracking-tight">
              Welcome back
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to access your personal workspace
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
                label="Email address"
                name="email"
                type="email"
                placeholder="your@email.com"
                defaultValue={state?.data?.email?.toString()}
                errors={state?.errors?.email}
                autoComplete="off"
                className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
              />
              <div className="space-y-1">
                <FormField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Your password"
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
                    Forgot password?
                  </Link>
                </div>
              </div>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold transition-all active:scale-[0.98]"
                disabled={pending}
              >
                {pending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isRegAllowed && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center text-sm text-muted-foreground"
          >
            Don&apos;t have an account yet?{' '}
            <Link
              href="/register"
              className="font-semibold text-foreground hover:underline underline-offset-4"
            >
              Sign up
            </Link>
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
