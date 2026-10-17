'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function InlineTitleEditor({
  title,
  onRename,
}: {
  title: string;
  onRename: (title: string) => Promise<boolean>;
}) {
  const router = useRouter();
  const t = useTranslations('InlineTitle');
  const [value, setValue] = useState(title);
  const [saved, setSaved] = useState(title);

  const save = async () => {
    const newTitle = value.trim();
    if (!newTitle) {
      setValue(saved);
      return;
    }
    if (newTitle === saved) return;
    setValue(newTitle);
    try {
      if (await onRename(newTitle)) {
        setSaved(newTitle);
        router.refresh();
        return;
      }
    } catch {
      // fall through: restore the saved title so the user can retry
    }
    setValue(saved);
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setValue(saved);
          e.currentTarget.blur();
        }
      }}
      maxLength={255}
      aria-label={t('titleLabel')}
      placeholder={t('titlePlaceholder')}
      className="w-full min-w-0 bg-transparent rounded-[8px] -mx-2 px-2 font-[inherit] tracking-[inherit] leading-[inherit] outline-none hover:bg-muted/50 focus:bg-muted/50 focus:ring-2 focus:ring-ring transition-colors"
    />
  );
}
