'use client';

import { search, SearchResult } from '@/app/lib/actions';
import { truncateWord } from '@/utils/text';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function NavSearch() {
  const [open, setOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const DEBOUNCE_MS = 350;
    if (!query) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await search(query);
        if (!cancelled) setResults(res);
      } catch (e) {
        console.error(e);
        if (!cancelled) setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInput.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleKeyDown = (key: string) => {
    const anchors = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('#search-results a')
    );
    const active = document.activeElement as HTMLAnchorElement | null;
    const currentIndex = anchors.findIndex((a) => a === active);

    if (key === 'ArrowDown') {
      const nextIndex =
        currentIndex < anchors.length - 1 ? currentIndex + 1 : 0;
      anchors[nextIndex]?.focus();
    } else if (key === 'ArrowUp') {
      const prevIndex =
        currentIndex > 0 ? currentIndex - 1 : anchors.length - 1;
      anchors[prevIndex]?.focus();
    } else if (key === 'Backspace') {
      searchInput.current?.focus();
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-full transition-colors"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span>Search</span>
        <div className="hidden md:flex items-center gap-1 ml-2 text-xs">
          <kbd className="px-1.5 py-0.5 bg-background border rounded">Alt</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-background border rounded">K</kbd>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl top-[20%] translate-y-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInput}
              type="text"
              className="pl-10"
              placeholder="Search boards and notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e.key)}
            />
          </div>
          <div
            id="search-results"
            className="max-h-[300px] overflow-y-auto"
            onKeyDown={(e) => handleKeyDown(e.key)}
          >
            {results.length === 0 ? (
              loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-2" />
                  <span>Searching...</span>
                </div>
              ) : query ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <span>No results found</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <span>Type to search boards and notes</span>
                </div>
              )
            ) : (
              <div className="divide-y">
                {results.map((item, index) => (
                  <Link
                    key={index}
                    href={item.url}
                    className="flex items-center gap-3 px-2 py-2 hover:bg-muted rounded-lg transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {item.type === 'note' ? (
                      <DocumentTextIcon
                        data-testid="note-icon"
                        className="h-5 w-5 text-orange-500"
                      />
                    ) : (
                      <Squares2X2Icon
                        data-testid="chalkboard-icon"
                        className="h-5 w-5 text-blue-500"
                      />
                    )}
                    <span className="text-sm">{truncateWord(item.title, 120)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          {results.length > 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Use arrow keys to navigate, Enter to select
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
