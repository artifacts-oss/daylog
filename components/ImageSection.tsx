import { getImageUrlOrFile } from '@/utils/image';
import {
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import Loader from '@/components/Loader';
import { cn } from '@/lib/utils';

type UnsplashImage = {
  id: string;
  description: string | null;
  user: { name: string; username: string };
  urls: { small: string; regular: string; thumb: string };
  links: { download: string };
};

type ImageSectionProps = {
  currentImageUrl?: string | null;
  onImageFileChange: (file?: File) => void;
  onImageUrlChange: (url: string) => void;
  onDeleteImage?: () => Promise<void>;
  isUnsplashAllowed?: boolean;
  altText: string;
};

export default function ImageSection({
  currentImageUrl,
  onImageFileChange,
  onImageUrlChange,
  onDeleteImage,
  isUnsplashAllowed = false,
  altText,
}: ImageSectionProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUnsplashMode, setIsUnsplashMode] = useState(false);

  // Unsplash States
  const [images, setImages] = useState<UnsplashImage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [keyword, setKeyword] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    onImageFileChange(file);
    if (file) {
      setSelectedFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onImageUrlChange('');
      setIsUnsplashMode(false);
    } else {
      setSelectedFileName(null);
      setPreviewUrl(null);
    }
  };

  const handleUnsplashSelect = (url: string) => {
    onImageUrlChange(url);
    if (url) {
      setPreviewUrl(url);
      onImageFileChange(undefined);
      setSelectedFileName(null);
    } else {
      setPreviewUrl(null);
    }
    setIsUnsplashMode(false);
  };

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
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/images/unsplash?keyword=${encodeURIComponent(keyword)}&page=${page}&per_page=8`,
      );

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 500 && text.includes('UNSPLASH_ACCESS_KEY')) {
          setError('Unsplash API key is not configured in the environment.');
        } else {
          setError('Failed to fetch images from Unsplash.');
        }
        setImages([]);
        return;
      }

      const data = await res.json();
      setImages(data.results || []);
      setKeyword(keyword);
      setPage(page);
    } catch (error) {
      console.error('Unsplash fetch error:', error);
      setError('An unexpected error occurred while searching.');
    } finally {
      setLoading(false);
    }
  };

  const displayUrl =
    previewUrl || (currentImageUrl ? getImageUrlOrFile(currentImageUrl) : null);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <Label className="text-[12px] font-bold uppercase text-muted-foreground">
          Cover Image
        </Label>
        <div className="flex gap-2">
          {isUnsplashMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] font-bold uppercase tracking-wider hover:bg-muted transition-colors"
              onClick={() => setIsUnsplashMode(false)}
            >
              <XMarkIcon className="h-3.5 w-3.5 mr-1" />
              Cancel Search
            </Button>
          )}
          {onDeleteImage &&
            currentImageUrl &&
            !previewUrl &&
            !isUnsplashMode && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-[11px] font-bold uppercase tracking-wider"
                onClick={onDeleteImage}
              >
                <TrashIcon className="h-3.5 w-3.5 mr-1" />
                Remove Current
              </Button>
            )}
        </div>
      </div>

      <div
        className={cn(
          'relative rounded-xl overflow-hidden border border-border bg-muted transition-all duration-300',
          isUnsplashMode ? 'h-[340px]' : 'aspect-[21/9]',
        )}
      >
        {isUnsplashMode ? (
          <div className="absolute inset-0 p-4 flex flex-col gap-4 overflow-hidden">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                autoFocus
                type="text"
                placeholder="Search high-quality images from Unsplash..."
                className="pl-10 h-10 rounded-xl bg-background border-border focus-visible:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    fetchImages(e.currentTarget.value, 1);
                  }
                }}
                onChange={(e) => debounceSearch(e.target.value, 1)}
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1">
              {loading ? (
                <div className="flex h-full items-center justify-center py-12">
                  <Loader caption="Searching beauty..." />
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center py-12 px-8 text-center">
                  <div className="alert-danger border border-destructive/20 rounded-xl p-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-2 rounded-full bg-[var(--color-text-accent-red)]/10 w-fit mx-auto mb-3">
                      <XMarkIcon className="h-6 w-6 text-accent-red" />
                    </div>
                    <p className="text-sm font-bold text-accent-red mb-1">
                      Search Failed
                    </p>
                    <p className="text-xs text-accent-red leading-relaxed">
                      {error}
                    </p>
                  </div>
                </div>
              ) : images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      className="group/item relative aspect-[4/3] rounded-lg overflow-hidden border border-border transition-all hover:border-foreground"
                      onClick={() => handleUnsplashSelect(image.urls.regular)}
                    >
                      <Image
                        fill
                        src={image.urls.thumb}
                        alt={image.description || 'Unsplash image'}
                        className="object-cover transition-transform duration-500 group-hover/item:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover/item:bg-black/20 transition-colors" />
                    </button>
                  ))}
                </div>
              ) : keyword ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/70 py-8">
                  <PhotoIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm font-medium">
                    No results found for &quot;{keyword}&quot;
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground/70 opacity-50 space-y-2">
                  <PhotoIcon className="h-12 w-12" />
                  <p className="text-xs font-bold uppercase tracking-widest text-center">
                    Enter a keyword to explore
                  </p>
                </div>
              )}
            </div>

            {images.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                  Page {page} of results
                </p>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg"
                    disabled={loading || page <= 1}
                    onClick={() => fetchImages(keyword, page - 1)}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg"
                    disabled={loading}
                    onClick={() => fetchImages(keyword, page + 1)}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : displayUrl ? (
          <div className="group relative h-full w-full">
            <Image
              fill
              src={displayUrl}
              alt={altText}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              priority={false}
            />
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center p-4">
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <label className="cursor-pointer bg-background text-foreground h-10 px-4 rounded-xl flex items-center justify-center font-bold text-sm hover:bg-background/90 transition-colors shadow-lg shrink-0">
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  Change Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {isUnsplashAllowed && (
                  <Button
                    type="button"
                    className="h-10 rounded-xl bg-white/20 border-white/30 text-white hover:bg-white/30 backdrop-blur-md font-bold text-sm"
                    onClick={() => setIsUnsplashMode(true)}
                  >
                    Select from Unsplash
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="p-4 rounded-full bg-background shadow-sm text-muted-foreground border border-border">
              <PhotoIcon className="h-8 w-8" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-col sm:flex-row gap-2 w-full px-4">
                <label className="cursor-pointer bg-primary text-primary-foreground h-10 px-6 rounded-xl flex items-center justify-center font-bold text-sm hover:bg-primary/90 transition-colors shadow-lg shrink-0 whitespace-nowrap">
                  Upload from Device
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                {isUnsplashAllowed && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl font-bold text-sm bg-background hover:bg-accent transition-colors"
                    onClick={() => setIsUnsplashMode(true)}
                  >
                    Search Unsplash
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/70 font-medium uppercase tracking-widest mt-1">
                1920x1080 recommended • max 5mb
              </p>
            </div>
          </div>
        )}
      </div>

      {selectedFileName && !isUnsplashMode && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground bg-accent px-3 py-1.5 rounded-lg w-fit animate-in fade-in slide-in-from-left-2">
          <PhotoIcon className="h-3.5 w-3.5" />
          <span className="font-medium truncate max-w-[200px]">
            {selectedFileName}
          </span>
          <button
            type="button"
            onClick={() => {
              onImageFileChange(undefined);
              setSelectedFileName(null);
              setPreviewUrl(null);
            }}
            className="ml-1 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
          >
            <TrashIcon className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
