'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { setUserNotesSort } from '../lib/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ArrowsUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

const sortOptions = [
  { labelKey: 'sortNewestFirst', value: 'created_desc' },
  { labelKey: 'sortOldestFirst', value: 'created_asc' },
  { labelKey: 'sortRecentlyUpdated', value: 'updated_desc' },
  { labelKey: 'sortLongestUnchanged', value: 'updated_asc' },
  { labelKey: 'sortTitleAsc', value: 'title_asc' },
  { labelKey: 'sortTitleDesc', value: 'title_desc' },
];

export default function NoteSortSelector({
  sortingParam,
  boardId,
}: {
  sortingParam?: string;
  boardId: number;
}) {
  const t = useTranslations('NotesPage');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentSort = sortingParam || 'created_desc';
  const currentLabel =
    t(sortOptions.find((opt) => opt.value === currentSort)?.labelKey || 'sort');

  const handleSort = async (sort: string) => {
    if (sort === currentSort) return;

    startTransition(async () => {
      await setUserNotesSort(sort);
      router.push(`/boards/${boardId}/notes?sort=${sort}`, { scroll: false });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-12 w-12 sm:w-auto rounded-xl px-0 sm:px-4 gap-2 bg-background/50 backdrop-blur-sm border-border hover:bg-muted transition-all shrink-0 font-bold text-[10px] uppercase tracking-widest shadow-sm',
            isPending && 'animate-pulse',
          )}
        >
          <ArrowsUpDownIcon className="h-4 w-4 text-foreground/70 shrink-0" />
          <span className="hidden sm:inline">
            {currentLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 rounded-2xl p-2 shadow-2xl border-primary/5"
      >
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSort(option.value)}
            className={cn(
              'rounded-xl flex items-center justify-between py-2 cursor-pointer focus:bg-primary/5',
              currentSort === option.value &&
                'bg-primary/5 text-primary font-bold',
            )}
          >
            <span className="text-sm">{t(option.labelKey)}</span>
            {currentSort === option.value && <CheckIcon className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
