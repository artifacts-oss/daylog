'use client';

import { motion } from 'framer-motion';
import { FAST } from '@/lib/motion';
import { PropsWithChildren } from 'react';

// Direct child of <AnimatePresence> in a list: enters, leaves and reflows quickly.
export default function AnimatedItem({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={FAST}
      className={className}
    >
      {children}
    </motion.div>
  );
}
