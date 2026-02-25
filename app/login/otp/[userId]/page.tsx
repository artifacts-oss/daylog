'use client';

import Image from 'next/image';
import Link from 'next/link';
import { getUserMFA } from '../../lib/actions';
import OTPLoginForm from './partials/OTPLoginForm';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function OTPLogin() {
  const params = useParams();
  const userId = parseInt(params?.userId as string);
  const [mfa, setMfa] = useState<boolean | null>(null);

  useEffect(() => {
    if (userId) {
      getUserMFA(userId).then(setMfa);
    }
  }, [userId]);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 10% 10%, hsl(var(--color-primary) / 0.03) 0%, transparent 40%),
          radial-gradient(circle at 90% 90%, hsl(var(--color-primary) / 0.02) 0%, transparent 40%),
          var(--color-background)
        `,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center"
        >
          <Link href="/">
            <Image
              src="/daylog.svg"
              width="0"
              height="0"
              alt="daylog"
              priority={true}
              className="mx-auto logo-invert drop-shadow-sm"
              style={{ width: 'auto', height: '56px' }}
            />
          </Link>
          <p className="mt-2 text-sm text-muted-foreground font-medium tracking-wide uppercase">
            Multifactor Authentication
          </p>
        </motion.div>

        {mfa === true ? (
          <OTPLoginForm userId={userId} />
        ) : mfa === false ? (
          <div className="text-center p-8 glass-card border rounded-lg">
            <p className="text-muted-foreground">
              Access denied or MFA not configured.
            </p>
            <Button variant="link" asChild className="mt-2">
              <Link href="/login">Return to login</Link>
            </Button>
          </div>
        ) : (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </motion.div>
    </div>
  );
}

import { Button } from '@/components/ui/button';
