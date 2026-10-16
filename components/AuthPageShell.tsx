'use client';

import { motion } from 'framer-motion';
import { FAST } from '@/lib/motion';
import Image from 'next/image';
import Link from 'next/link';
import { ReactNode } from 'react';

type AuthPageShellProps = {
  tagline?: string;
  mirrored?: boolean;
  logoHref?: string;
  children: ReactNode;
};

export default function AuthPageShell({
  tagline,
  mirrored = false,
  logoHref,
  children,
}: AuthPageShellProps) {
  const [primarySpot, secondarySpot] = mirrored
    ? ['90% 10%', '10% 90%']
    : ['10% 10%', '90% 90%'];

  const logo = (
    <Image
      src="/daylog.svg"
      width="0"
      height="0"
      alt="daylog"
      priority={true}
      className="mx-auto logo-invert drop-shadow-sm"
      style={{ width: 'auto', height: '56px' }}
    />
  );

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-background px-4 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at ${primarySpot}, hsl(var(--color-primary) / 0.03) 0%, transparent 40%),
          radial-gradient(circle at ${secondarySpot}, hsl(var(--color-primary) / 0.02) 0%, transparent 40%),
          var(--color-background)
        `,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={FAST}
        className="relative z-10 w-full max-w-sm space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={FAST}
          className="text-center"
        >
          {logoHref ? <Link href={logoHref}>{logo}</Link> : logo}
          {tagline && (
            <p className="mt-2 text-sm text-muted-foreground font-medium tracking-wide uppercase">
              {tagline}
            </p>
          )}
        </motion.div>

        {children}
      </motion.div>
    </div>
  );
}
