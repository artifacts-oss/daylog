'use client';

import { useSearchParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function AlertSuccess() {
  const searchParams = useSearchParams();
  const saved = searchParams.get('saved');
  const [visible, setVisible] = useState(true);

  if (saved !== 'true' || !visible) return null;

  return (
    <Alert className="relative">
      <CheckCircleIcon className="h-4 w-4" />
      <AlertTitle>Saved changes</AlertTitle>
      <AlertDescription>Your changes have been saved!</AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2"
        onClick={() => setVisible(false)}
      >
        <XMarkIcon className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
