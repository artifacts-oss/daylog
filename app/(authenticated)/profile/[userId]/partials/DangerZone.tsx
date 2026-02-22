'use client';

import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useActionState } from 'react';
import { deleteAccount } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

type BackupType = {
  profile: {
    id: number;
    name: string | null;
    email: string | null;
  };
};

export default function DangerZone({ profile }: BackupType) {
  const [state, action, pending] = useActionState(deleteAccount, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="userId" defaultValue={profile.id} />
      <Card className="mt-4 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Once your account is deleted, all of its resources and data will be
            permanently deleted. Before deleting your account, please download
            any data or information that you wish to retain.
          </p>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-destructive" />
                  Are you sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Do you really want to delete your account? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {!state?.success && state?.message && (
                <Alert variant="destructive">
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Input
                  type="password"
                  name="password"
                  placeholder="Your password is required"
                />
                {state?.errors?.password && (
                  <p className="text-sm text-destructive">{state?.errors?.password}</p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={pending}
                  onClick={() => {}}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {pending ? 'Deleting...' : 'Yes, delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </form>
  );
}
