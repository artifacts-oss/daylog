'use client';

import {
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useActionState, useState } from 'react';
import { backupData } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

type BackupType = {
  profile: {
    id: number;
    name: string | null;
    email: string | null;
  };
};

export default function Backup({ profile }: BackupType) {
  const [state, action, pending] = useActionState(backupData, undefined);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof state?.data === 'string') {
      navigator.clipboard.writeText(state.data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <form action={action}>
      <input type="hidden" name="userId" defaultValue={profile.id} />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Backup</CardTitle>
          <p className="text-sm text-muted-foreground">
            Save or export all your data in a JSON file, depending of your data
            it may take a while, please don&apos;t refresh in this page until
            save file dialog appears.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!state?.success && state?.message && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          {state?.success && state.data && (
            <div className="space-y-2">
              <Textarea
                disabled={pending}
                rows={5}
                defaultValue={typeof state.data === 'string' ? state.data : ''}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 mr-2" />
                ) : (
                  <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                )}
                {copied ? 'Copied!' : 'Copy JSON'}
              </Button>
            </div>
          )}
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            {pending ? 'Processing...' : 'Download Data'}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
