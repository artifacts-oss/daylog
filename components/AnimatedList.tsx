'use client';

import { AnimatePresence } from 'framer-motion';
import { PropsWithChildren } from 'react';

// initial={false}: the page itself already fades in, so only adds/removes/reorders animate.
export default function AnimatedList({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {children}
      </AnimatePresence>
    </div>
  );
}
