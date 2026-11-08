'use client';

import AuthPageShell from '@/components/AuthPageShell';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getUserMFA } from '../../lib/actions';
import OTPLoginForm from './partials/OTPLoginForm';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function OTPLogin() {
  const t = useTranslations('OTPPage');
  const params = useParams();
  const userId = Number.parseInt(params?.userId as string);
  const [mfa, setMfa] = useState<boolean | null>(null);

  useEffect(() => {
    if (userId) {
      void getUserMFA(userId).then(setMfa);
    }
  }, [userId]);

  return (
    <AuthPageShell tagline={t('title')} logoHref="/">
      {mfa === true ? (
        <OTPLoginForm userId={userId} />
      ) : mfa === false ? (
        <div className="text-center p-8 glass-card border rounded-lg">
          <p className="text-muted-foreground">
            {t('accessDenied')}
          </p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/login">{t('returnToLogin')}</Link>
          </Button>
        </div>
      ) : (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </AuthPageShell>
  );
}
