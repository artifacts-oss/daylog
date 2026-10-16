'use client';

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { forwardRef, useState } from 'react';
import { Input, type InputProps } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PasswordInputProps = Omit<InputProps, 'type'>;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const t = useTranslations('PasswordInput');
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          {...props}
          type={isVisible ? 'text' : 'password'}
          // pr-10 last so a caller's px-* can't push text under the toggle
          className={cn(className, 'pr-10')}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsVisible((v) => !v)}
          aria-label={isVisible ? t('hide') : t('show')}
          aria-pressed={isVisible}
        >
          {isVisible ? (
            <EyeSlashIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
