'use client';

import { FAST } from '@/lib/motion';
import { MotionConfig, motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="min-h-full flex flex-col"
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={FAST}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
