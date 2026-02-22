'use client';

import { redirect } from 'next/navigation';
import { setUserBoardsSort } from '../lib/actions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function BoardSortSelector({
  sortingParam,
}: {
  sortingParam?: string;
}) {
  const handleSortChange = async (value: string) => {
    await setUserBoardsSort(value);
    redirect(`/boards?sort=${value}`);
  };

  return (
    <Select
      defaultValue={sortingParam || 'created_desc'}
      onValueChange={handleSortChange}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="created_desc">Created: Newest First</SelectItem>
        <SelectItem value="created_asc">Created: Oldest First</SelectItem>
        <SelectItem value="updated_desc">Updated: Newest First</SelectItem>
        <SelectItem value="updated_asc">Updated: Oldest First</SelectItem>
        <SelectItem value="title_asc">Title: A-Z</SelectItem>
        <SelectItem value="title_desc">Title: Z-A</SelectItem>
      </SelectContent>
    </Select>
  );
}
