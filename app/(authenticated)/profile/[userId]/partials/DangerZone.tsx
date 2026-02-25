'use client';

import { TrashIcon } from '@heroicons/react/24/outline';
import { useActionState, useState } from 'react';
import { deleteAccount } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertOctagon } from 'lucide-react';

type BackupType = {
  profile: {
    id: number;
    name: string | null;
    email: string | null;
  };
};

export default function DangerZone({ profile }: BackupType) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, undefined);

  return (
    <Card className="mt-4 rounded-[20px] bg-card shadow-none">
      <CardHeader>
        <Label className="text-destructive">Danger Zone</Label>
        <CardTitle>Delete Account</CardTitle>
        <p className="text-sm text-muted-foreground font-medium">
          Once your account is deleted, all of its resources and data will be
          permanently deleted.
        </p>
      </CardHeader>
      <CardContent>
        <Button
          variant="danger"
          onClick={() => setOpen(true)}
          className="rounded-[12px] font-bold h-[44px] px-6 transition-all hover:scale-[1.02] active:scale-95 shadow-none"
        >
          <TrashIcon className="h-4 w-4 mr-2" />
          Delete My Account
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="p-10 max-w-[480px]">
            <DialogHeader className="mb-6">
              <Label className="text-destructive">Security Verification</Label>
              <DialogTitle className="flex items-center gap-2">
                Confirm Deletion
              </DialogTitle>
            </DialogHeader>

            <form action={action}>
              <input type="hidden" name="userId" value={profile.id} />

              <div className="space-y-8">
                <p className="text-sm text-muted-foreground leading-relaxed antialiased">
                  This action is permanent and cannot be undone. All your notes,
                  settings, and personal data will be erased from our servers.
                </p>

                <div className="space-y-4">
                  <div className="text-[12px] font-bold text-muted-foreground uppercase tracking-tight ml-1">
                    Confirm Password
                  </div>
                  <Input
                    type="password"
                    name="password"
                    placeholder="Enter your account password"
                    className={`h-[48px] rounded-[12px] border-border/60 bg-secondary/5 px-4 font-medium ${
                      state?.errors?.password
                        ? 'border-destructive ring-destructive/20'
                        : ''
                    }`}
                  />
                  {state?.errors?.password && (
                    <p className="text-[12px] font-bold text-accent-red mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                      {state?.errors?.password}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-destructive/20">
                  <p className="text-[12px] text-destructive font-medium leading-normal flex gap-2">
                    <AlertOctagon className="h-4 w-4 flex-shrink-0" />
                    Warning: You will lose access to all your 2FA settings and
                    recovery codes.
                  </p>
                </div>

                {!state?.success && state?.message && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs font-bold">
                      {state.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter className="mt-8 gap-3 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="rounded-[12px] text-muted-foreground font-bold hover:bg-secondary/10"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  type="submit"
                  disabled={pending}
                  className="font-bold px-8 shadow-none"
                >
                  {pending ? 'Deleting...' : 'Yes, Delete Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
