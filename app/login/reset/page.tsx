'use client';

import { EnvelopeIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useActionState } from 'react';
import { reset } from './lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function Page() {
  const [state, action, pending] = useActionState(reset, undefined);

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

        {state?.success && (
          <Alert className="border-green-500 text-green-500">
            <CheckCircleIcon className="h-4 w-4" />
            <AlertTitle>Account reset</AlertTitle>
            <AlertDescription>
              Your account has been reset successfully. Please check your email
              inbox and follow the instructions.
            </AlertDescription>
            <Button variant="outline" className="mt-2" asChild>
              <a href="/login">Go to login</a>
            </Button>
          </Alert>
        )}

        {state?.message && !state?.success && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Could not reset</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Forgot password</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Enter your email address and we will send you instructions to
              reset your password.
            </p>
            <form action={action} autoComplete="off" noValidate className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="Enter email"
                  className={state?.errors?.email ? 'border-destructive' : ''}
                />
                {state?.errors?.email && (
                  <p className="text-sm text-destructive">{state?.errors?.email}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                {pending ? 'Sending...' : 'Send me a new password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Never mind,{' '}
          <a href="/login" className="text-foreground hover:underline">
            take me back
          </a>{' '}
          to the sign in screen.
        </p>
      </div>
    </div>
  );
}
