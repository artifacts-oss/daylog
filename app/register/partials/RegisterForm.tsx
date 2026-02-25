'use client';

import FormField from '@/components/FormField';
import Image from 'next/image';
import Link from 'next/link';
import { useActionState } from 'react';
import { signup } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 90% 10%, hsl(var(--color-primary) / 0.03) 0%, transparent 40%),
          radial-gradient(circle at 10% 90%, hsl(var(--color-primary) / 0.02) 0%, transparent 40%),
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
            The home for your ideas
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
                <AlertTitle>Account not created</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {state?.success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Alert className="border-green-500/20 bg-green-500/5 text-green-500 backdrop-blur-sm">
                <CheckCircleIcon className="h-4 w-4" />
                <AlertTitle className="font-bold">Account created</AlertTitle>
                <AlertDescription>
                  Your account has been created successfully
                </AlertDescription>
                <Button
                  variant="outline"
                  className="mt-4 w-full border-green-500/30 hover:bg-green-500/20"
                  asChild
                >
                  <Link href="/login">Go to login</Link>
                </Button>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {!state?.success && (
          <Card className="glass-card border-border/50 shadow-xl backdrop-blur-md bg-card/70 ring-1 ring-white/10">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Create account
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Create an account to start your digital journal
              </p>
            </CardHeader>
            <CardContent>
              <form action={action} autoComplete="off" className="space-y-4">
                <FormField
                  label="Name"
                  name="name"
                  placeholder="Enter your name"
                  defaultValue={state?.data?.name?.toString()}
                  errors={state?.errors?.name}
                  className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
                />
                <FormField
                  label="Email address"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  defaultValue={state?.data?.email?.toString()}
                  errors={state?.errors?.email}
                  className="transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20"
                />
                <FormField
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Create a strong password"
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
                      I agree to the{' '}
                      <Link
                        href="/register/terms"
                        className="text-foreground hover:underline underline-offset-2"
                      >
                        terms and policy
                      </Link>
                    </Label>
                  </div>
                  {state?.errors?.terms && (
                    <p className="text-[11px] font-medium text-destructive ml-6">
                      {state?.errors?.terms}
                    </p>
                  )}
                </div>
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
                      Creating account...
                    </span>
                  ) : (
                    'Create account'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground"
        >
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-foreground hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
