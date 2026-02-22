'use client';

import { AnimatePresence, motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <AnimatePresence>
      <motion.div
        className="min-h-full flex flex-col"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ease: 'backOut', duration: 0.75 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
