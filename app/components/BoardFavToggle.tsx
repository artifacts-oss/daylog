'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function BoardFavSwitch({
  showFavParam = false,
}: {
  showFavParam?: boolean;
}) {
  const router = useRouter();
  const [showFav, setShowFav] = useState(showFavParam);

  const handleToggle = (isFav: boolean) => {
    const params = new URLSearchParams(window.location.search);
    params.set('showFav', isFav ? 'true' : 'false');
    router.prefetch('/');
    router.push('?' + params.toString());
    setShowFav(isFav);
  };

  return (
    <div className="flex rounded-lg border overflow-hidden">
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'rounded-none border-r',
          !showFav && 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        onClick={() => handleToggle(false)}
      >
        Show recent
      </Button>
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'rounded-none',
          showFav && 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        onClick={() => handleToggle(true)}
      >
        Favorites
      </Button>
    </div>
  );
}
