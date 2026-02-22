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
      document.querySelectorAll<HTMLAnchorElement>('#search-results a'),
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
        id="nav-search-trigger"
        onClick={() => setOpen(true)}
        type="button"
        className="flex items-center gap-2 px-4 py-2 text-sm text-[#6B7280] bg-[#F8F8F8] border border-[#E5E7EB] hover:bg-[#F3F4F6] rounded-xl transition-all duration-300"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="font-medium">Search anything...</span>
        <div className="hidden md:flex items-center gap-1 ml-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
          <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E7EB] rounded-md">
            Alt
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E7EB] rounded-md">
            K
          </kbd>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl top-[20%] translate-y-0 pt-6">
          <DialogHeader>
            <DialogTitle className="text-[24px] font-[700] text-[#000000] tracking-tight">
              Search
            </DialogTitle>
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
            className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-1"
            onKeyDown={(e) => handleKeyDown(e.key)}
          >
            {results.length === 0 ? (
              loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#9CA3AF]">
                  <div className="animate-spin h-8 w-8 border-2 border-[#000000] border-t-transparent rounded-full mb-3" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Searching...
                  </span>
                </div>
              ) : query ? (
                <div className="flex flex-col items-center justify-center py-12 text-[#9CA3AF]">
                  <span className="text-sm">
                    No results found for "{query}"
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-[#9CA3AF]">
                  <MagnifyingGlassIcon className="h-10 w-10 mb-4 opacity-20" />
                  <span className="text-sm">
                    Quickly find boards and notes by title or content
                  </span>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-1">
                {results.map((item, index) => (
                  <Link
                    key={index}
                    href={item.url}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-[#F8F8F8] border border-transparent hover:border-[#E5E7EB] rounded-xl transition-all duration-200 group focus:bg-[#F8F8F8] focus:border-[#E5E7EB] outline-none"
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center gap-3">
                      {item.type === 'note' ? (
                        <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                          <DocumentTextIcon className="h-4 w-4 text-orange-600" />
                        </div>
                      ) : (
                        <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <Squares2X2Icon className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-[#000000] line-clamp-1">
                          {truncateWord(item.title, 80)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
                          {item.type}
                        </span>
                      </div>
                    </div>
                    {item.matchContent && (
                      <p className="text-[12px] text-[#6B7280] leading-relaxed ml-11 line-clamp-2 italic">
                        {item.matchContent}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {results.length > 0 && (
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] pt-4 border-t border-[#E5E7EB] mt-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1 py-0.5 bg-[#F8F8F8] border border-[#E5E7EB] rounded text-[10px]">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1 py-0.5 bg-[#F8F8F8] border border-[#E5E7EB] rounded text-[10px]">
                    Enter
                  </kbd>
                  Open
                </span>
              </div>
              <span>{results.length} results</span>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
