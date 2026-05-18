import Loader from '@/components/Loader';
import { useTranslations } from 'next-intl';

export default function Loading() {
  const t = useTranslations('Loading');

  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-500">
      <Loader caption={t('caption')} />
    </div>
  );
}
