'use client';

import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useActionState } from 'react';
import { updatePassword } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type UpdatePassType = {
  userId: number | null;
  profile: {
    id: number;
    name: string | null;
    email: string | null;
  };
};

export default function UpdatePass({ userId, profile }: UpdatePassType) {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={action}>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ensure your account is using a long, random password to stay secure.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <input type="hidden" name="id" value={profile.id} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profile.id === userId && (
              <div className="space-y-2 relative pb-4">
                <Label htmlFor="current">Current Password</Label>
                <Input
                  id="current"
                  type="password"
                  name="current"
                  placeholder="Enter current password"
                />
                {state?.errors?.current && (
                  <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                    {state?.errors?.current}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2 relative pb-4">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                defaultValue={state?.data?.password?.toString()}
                placeholder="Enter your new secure password"
              />
              {state?.errors?.password && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {state?.errors?.password}
                </p>
              )}
            </div>
            <div className="space-y-2 relative pb-4">
              <Label htmlFor="confirm">Password Confirmation</Label>
              <Input
                id="confirm"
                type="password"
                name="confirm"
                placeholder="Confirm your new password"
              />
              {state?.errors?.confirm && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {state?.errors?.confirm}
                </p>
              )}
            </div>
          </div>
          {!state?.success && state?.message && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          {state?.success && state?.message && (
            <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending}>
            <LockClosedIcon className="h-4 w-4 mr-2" />
            {pending ? 'Updating...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
