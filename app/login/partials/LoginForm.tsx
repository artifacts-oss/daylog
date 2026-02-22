'use client';

import FormField from '@/components/FormField';
import Image from 'next/image';
import { useActionState, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signin } from '../lib/actions';
import { validateAllowRegistration } from '@/app/register/lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <Image
            src="/daylog.svg"
            width="0"
            height="0"
            alt="daylog"
            priority={true}
            className="mx-auto"
            style={{ width: 'auto', height: '48px' }}
          />
        </div>

        {state?.message && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Could not login</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Login to your account</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={action}
              autoComplete="off"
              noValidate
              className="space-y-2"
            >
              <FormField
                label="Email address"
                name="email"
                type="email"
                placeholder="your@email.com"
                defaultValue={state?.data?.email?.toString()}
                errors={state?.errors?.email}
                autoComplete="off"
              />
              <FormField
                label="Password"
                name="password"
                type="password"
                placeholder="Your password"
                defaultValue={state?.data?.password?.toString()}
                errors={state?.errors?.password}
                autoComplete="off"
              />
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Signing in...' : 'Sign in'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <a href="/login/reset" className="hover:text-foreground">
                  Forgot password?
                </a>
              </div>
            </form>
          </CardContent>
        </Card>

        {isRegAllowed && (
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account yet?{' '}
            <a href="./register" className="text-foreground hover:underline">
              Sign up
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
