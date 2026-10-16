'use client';

import { useRouter } from 'next/navigation';
import { useOptimistic, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { FAST } from '@/lib/motion';
import { useTranslations } from 'next-intl';
import { GlobeAltIcon, UsersIcon } from '@heroicons/react/24/outline';

export default function CommunityTabSwitch({
  activeTabParam = 'all',
}: {
  activeTabParam?: 'all' | 'withMe';
}) {
  const t = useTranslations('CommunityPage');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setOptimisticTab] = useOptimistic(activeTabParam);

  const handleToggle = (tab: 'all' | 'withMe') => {
    if (tab === activeTab) return;

    startTransition(() => {
      setOptimisticTab(tab);
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      router.push('?' + params.toString(), { scroll: false });
    });
  };

  return (
    <div className="relative p-1 bg-secondary rounded-full border border-primary/5 flex items-center shadow-inner">
      <div className="relative flex items-center w-full">
        <motion.div
          initial={false}
          animate={{ x: activeTab === 'withMe' ? '100%' : '0%' }}
          transition={FAST}
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1/2 rounded-full shadow-sm border border-primary/5 bg-background transition-colors duration-300',
          )}
        />

        <button
          onClick={() => handleToggle('all')}
          className={cn(
            'relative z-10 w-1/2 px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors duration-200',
            activeTab === 'all'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <GlobeAltIcon className="h-3.5 w-3.5" />
          {t('tabAll')}
        </button>

        <button
          onClick={() => handleToggle('withMe')}
          className={cn(
            'relative z-10 w-1/2 px-4 py-2 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors duration-200',
            activeTab === 'withMe'
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <UsersIcon className="h-3.5 w-3.5" />
          {t('tabSharedWithMe')}
        </button>
      </div>

      {isPending && (
        <div className="absolute inset-0 bg-background/20 rounded-full animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
