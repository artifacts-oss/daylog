'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function BoardFavSwitch({
  showFavParam = false,
}: {
  showFavParam?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showFav, setShowFav] = useState(showFavParam);

  const handleToggle = (isFav: boolean) => {
    if (isFav === showFav) return;

    setShowFav(isFav);
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      params.set('showFav', isFav ? 'true' : 'false');
      router.push('?' + params.toString(), { scroll: false });
    });
  };

  return (
    <div className="relative p-1 bg-secondary rounded-full border border-primary/5 flex items-center shadow-inner">
      <div className="relative flex items-center w-full">
        {/* Animated Background Slider */}
        <motion.div
          initial={false}
          animate={{ x: showFav ? '100%' : '0%' }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="absolute left-0 top-0 bottom-0 w-1/2 bg-background rounded-full shadow-sm border border-primary/5"
        />

        <button
          onClick={() => handleToggle(false)}
          className={cn(
            'relative z-10 flex-1 px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-200',
            !showFav
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Recent
        </button>

        <button
          onClick={() => handleToggle(true)}
          className={cn(
            'relative z-10 flex-1 px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors duration-200',
            showFav
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Favorites
        </button>
      </div>

      {isPending && (
        <div className="absolute inset-0 bg-background/20 rounded-full animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
