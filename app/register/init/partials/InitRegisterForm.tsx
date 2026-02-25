'use client';

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useActionState, useState } from 'react';
import { signupInit } from '../lib/actions';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function InitRegisterForm() {
  const [state, action, pending] = useActionState(signupInit, undefined);
  const [isShowPassword, setIsShowPassword] = useState(false);

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
            <AlertTitle>Account not created</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        {state?.success && (
          <Alert className="border-green-500 text-green-500">
            <CheckCircleIcon className="h-4 w-4" />
            <AlertTitle>Account created</AlertTitle>
            <AlertDescription>
              Admin account created successfully.
            </AlertDescription>
            <Button asChild className="mt-2">
              <Link href="/login">Go to login</Link>
            </Button>
          </Alert>
        )}

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Admin registration</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} autoComplete="off" className="space-y-2">
              <div className="space-y-2 relative pb-5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={state?.data?.name?.toString()}
                  placeholder="Enter name"
                  className={state?.errors?.name ? 'border-destructive' : ''}
                />
                {state?.errors?.name && (
                  <p className="text-[12px] text-destructive absolute bottom-0 left-0">
                    {state?.errors?.name}
                  </p>
                )}
              </div>
              <div className="space-y-2 relative pb-5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={state?.data?.email?.toString()}
                  placeholder="Enter email"
                  className={state?.errors?.email ? 'border-destructive' : ''}
                />
                {state?.errors?.email && (
                  <p className="text-[12px] text-destructive absolute bottom-0 left-0">
                    {Array.isArray(state?.errors?.email)
                      ? state?.errors?.email.join(', ')
                      : state?.errors?.email}
                  </p>
                )}
              </div>
              <div className="space-y-2 relative pb-5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={isShowPassword ? 'text' : 'password'}
                    name="password"
                    defaultValue={state?.data?.password?.toString()}
                    placeholder="Password"
                    autoComplete="off"
                    className={
                      state?.errors?.password
                        ? 'border-destructive pr-10'
                        : 'pr-10'
                    }
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsShowPassword(!isShowPassword)}
                  >
                    {isShowPassword ? (
                      <EyeSlashIcon className="h-4 w-4" />
                    ) : (
                      <EyeIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {state?.errors?.password && (
                  <p className="text-[12px] text-destructive absolute bottom-0 left-0">
                    {Array.isArray(state?.errors?.password)
                      ? state?.errors?.password.join(', ')
                      : state?.errors?.password}
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                By registering your first Admin user you are accepting the{' '}
                <a
                  href="/register/terms"
                  className="text-primary hover:underline"
                >
                  terms and policy
                </a>
                .
              </p>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? 'Creating account...' : 'Create admin account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
