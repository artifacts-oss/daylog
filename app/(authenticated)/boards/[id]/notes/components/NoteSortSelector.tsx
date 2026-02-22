'use client';

import { useRouter } from 'next/navigation';
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
  { label: 'Newest First', value: 'created_desc' },
  { label: 'Oldest First', value: 'created_asc' },
  { label: 'Recently Updated', value: 'updated_desc' },
  { label: 'Longest Unchanged', value: 'updated_asc' },
  { label: 'Title: A-Z', value: 'title_asc' },
  { label: 'Title: Z-A', value: 'title_desc' },
];

export default function NoteSortSelector({
  sortingParam,
  boardId,
}: {
  sortingParam?: string;
  boardId: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const currentSort = sortingParam || 'created_desc';
  const currentLabel =
    sortOptions.find((opt) => opt.value === currentSort)?.label || 'Sort';

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
          size="sm"
          className={cn(
            'rounded-xl px-4 gap-2 bg-background/50 backdrop-blur-sm border-primary/5 hover:border-primary/20 transition-all',
            isPending && 'animate-pulse',
          )}
        >
          <ArrowsUpDownIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest">
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
            <span className="text-sm">{option.label}</span>
            {currentSort === option.value && <CheckIcon className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
