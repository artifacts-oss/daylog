'use client';

import { validateMFA } from '@/app/login/lib/actions';
import OTPInputWrapper from '@/components/OTPInputWrapper';
import { useActionState, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function OTPLoginForm({ userId }: { userId: number }) {
  const [password, setPassword] = useState('');
  const [state, action, pending] = useActionState(validateMFA, undefined);

  useEffect(() => {
    // Resolves Bootstrap modal issue when redirects to login from a modal.
    const modal = document.getElementsByClassName('modal-backdrop');
    if (modal.length > 0) modal[0].remove();
  }, []);

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {state?.message && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
          >
            <Alert
              variant={
                state.message.includes('locked') ? 'destructive' : 'destructive'
              }
              className="glass-card border-destructive/50"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>
                {state.message.includes('locked')
                  ? 'Account Locked'
                  : 'Verification failed'}
              </AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="glass-card border-border/50 shadow-xl backdrop-blur-md bg-card/70 ring-1 ring-white/10">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center mb-4 ring-1 ring-primary/10">
            <LockClosedIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Security Code
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6-digit code from your authenticator app
          </p>
        </CardHeader>
        <CardContent>
          <form
            action={action}
            autoComplete="off"
            noValidate
            className="space-y-6"
          >
            <input name="id" type="hidden" value={userId} />
            <input name="password" type="hidden" value={password} />

            <div className="flex flex-col items-center justify-center space-y-4">
              <OTPInputWrapper onChange={(value) => setPassword(value)} />
              {state?.errors?.password && (
                <p className="text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
                  {state.errors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold transition-all active:scale-[0.98]"
              disabled={pending || password.length < 6}
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
                  Verifying...
                </span>
              ) : (
                'Verify securely'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Use your authenticator app to generate a code <br /> and enter it
              above.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
