'use client';

import { signup } from '@/app/register/lib/actions';
import { EyeIcon, EyeSlashIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function UserModal() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state?.success) {
      window.location.reload();
    }
  }, [state]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4 mr-2" />
        Create new user
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New user</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new user.
            </DialogDescription>
          </DialogHeader>
          <form autoComplete="off" action={action} className="space-y-2">
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
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
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
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
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
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {Array.isArray(state?.errors?.password)
                    ? state?.errors?.password.join(', ')
                    : state?.errors?.password}
                </p>
              )}
            </div>
            <input name="terms" type="hidden" value="accept" />
            {state?.message && (
              <Alert variant="destructive">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Account not created</AlertTitle>
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
