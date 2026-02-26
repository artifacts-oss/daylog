'use client';

import { User } from '@/prisma/generated/client';
import { CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { useActionState } from 'react';
import { updateProfile } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

type ProfileInfoType = {
  profile: User;
};

export default function ProfileInfo({ profile }: ProfileInfoType) {
  const [state, action, pending] = useActionState(updateProfile, undefined);

  return (
    <form action={action}>
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <p className="text-sm text-muted-foreground">
            Update your account&apos;s profile information and email address.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <input type="hidden" name="id" value={profile.id ?? 0} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2 relative pb-5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                name="name"
                defaultValue={
                  typeof state?.data?.name === 'string'
                    ? state.data.name
                    : (profile.name ?? '')
                }
                placeholder="Enter your nickname, name or fullname"
              />
              {state?.errors?.name && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {state?.errors?.name}
                </p>
              )}
            </div>
            <div className="space-y-2 relative pb-5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                name="email"
                defaultValue={
                  typeof state?.data?.email === 'string'
                    ? state.data.email
                    : (profile.email ?? '')
                }
                placeholder="Enter your email for password recovery"
              />
              {state?.errors?.email && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {Array.isArray(state?.errors?.email)
                    ? state?.errors?.email.join(', ')
                    : state?.errors?.email}
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
            <CloudArrowDownIcon className="h-4 w-4 mr-2" />
            {pending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
