'use client';

import Loader from '@/components/Loader';
import {
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type UnsplashImage = {
  id: string;
  description: string | null;
  user: { name: string; username: string };
  urls: { small: string; regular: string; thumb: string };
  links: { download: string };
};

export default function UnsplashImagesDropdown({
  imageSelected,
  className,
}: {
  imageSelected: (imageUrl: string) => void;
  className?: string;
}) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [selection, setSelection] = useState<string>('');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [open, setOpen] = useState(false);

  const debounceSearch = (
    keyword: string,
    page: number,
    time: number = 1000,
  ) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    const timeout = setTimeout(async () => {
      await fetchImages(keyword, page);
    }, time);

    setDebounceTimer(timeout);
  };

  const fetchImages = async (keyword: string, page: number) => {
    if (!keyword || keyword.length < 2) {
      setImages([]);
      return;
    }

    setLoading(true);
    const res = await fetch(
      `/api/v1/images/unsplash?keyword=${keyword}&page=${page}&per_page=9`,
    ).finally(() => {
      setKeyword(keyword);
      setLoading(false);
      setPage(page);
    });
    const images = await res.json();
    setImages(images.results);
  };

  const selectedImage = images.find((image) => image.id === selection);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={imageUrl ? 'default' : 'outline'}
          className={cn('w-full', className)}
        >
          {imageUrl ? 'Image selected' : 'Search Unsplash images'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-80 p-4"
        align="start"
        side="right"
        sideOffset={10}
      >
        <div className="space-y-3">
          <div>
            <Label>Search by keyword</Label>
            <Input
              type="text"
              placeholder="Type any keyword"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  debounceSearch(e.currentTarget.value, 1, 0);
                }
              }}
              onChange={(e) => {
                debounceSearch(e.target.value, 1);
              }}
            />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {loading && (
              <div className="col-span-3">
                <Loader caption="Loading images..." />
              </div>
            )}
            {!loading && images.length === 0 && (
              <div className="col-span-3 text-center text-muted-foreground py-4">
                No images found
              </div>
            )}
            {images.map((image) => (
              <button
                key={image.id}
                type="button"
                className={cn(
                  'relative aspect-square overflow-hidden rounded border-2 transition-colors',
                  selection === image.id
                    ? 'border-primary'
                    : 'border-transparent hover:border-muted-foreground',
                )}
                onClick={() => {
                  setSelection(image.id);
                  setImageUrl(image.urls.regular);
                  imageSelected(image.urls.regular);
                }}
              >
                <Image
                  title={'Photo by ' + image.user.name + ' on Unsplash'}
                  src={image.urls.thumb}
                  alt={image.description || 'Unsplash image'}
                  width={100}
                  height={100}
                  className="object-cover w-full h-full"
                  priority
                />
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            {selectedImage && (
              <a
                href={`https://unsplash.com/@${selectedImage?.user.username}`}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Photo by {selectedImage?.user.name}
              </a>
            )}
            {(images.length > 0 || loading) && (
              <div className="flex gap-1 ml-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading || page <= 1}
                  onClick={async () => {
                    await fetchImages(keyword, page - 1);
                  }}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={async () => {
                    await fetchImages(keyword, page + 1);
                  }}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={async () => {
              setImageUrl('');
              setSelection('');
              imageSelected('');
            }}
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Clear selection
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
