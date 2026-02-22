'use client';

import FormField from '@/components/FormField';
import Image from 'next/image';
import { useActionState } from 'react';
import { signup } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Label } from '@/components/ui/label';

export default function RegisterForm() {
  const [state, action, pending] = useActionState(signup, undefined);

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
            <AlertTitle>Account not created</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state?.success && (
          <Alert className="border-green-500 text-green-500">
            <CheckCircleIcon className="h-4 w-4" />
            <AlertTitle>Account created</AlertTitle>
            <AlertDescription>
              Your account has been created successfully
            </AlertDescription>
            <Button variant="outline" className="mt-2" asChild>
              <a href="/login">Go to login</a>
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Account registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} autoComplete="off" className="space-y-4">
              <FormField
                label="Name"
                name="name"
                placeholder="Enter name"
                defaultValue={state?.data?.name?.toString()}
                errors={state?.errors?.name}
              />
              <FormField
                label="Email address"
                name="email"
                type="email"
                placeholder="Enter email"
                defaultValue={state?.data?.email?.toString()}
                errors={state?.errors?.email}
              />
              <FormField
                label="Password"
                name="password"
                type="password"
                placeholder="Enter password"
                defaultValue={state?.data?.password?.toString()}
                errors={state?.errors?.password}
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    name="terms"
                    type="checkbox"
                    id="terms"
                    defaultChecked={state?.data?.terms?.toString() === 'on'}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="terms" className="font-normal">
                    Agree the{' '}
                    <a href="/register/terms" className="text-primary hover:underline">
                      terms and policy
                    </a>
                    .
                  </Label>
                </div>
                {state?.errors?.terms && (
                  <p className="text-sm text-destructive">{state?.errors?.terms}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Creating account...' : 'Create new account'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="./login" className="text-foreground hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
