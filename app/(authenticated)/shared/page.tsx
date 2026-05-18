import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getCurrentSession } from '@/app/login/lib/actions';
import { getSharesWithMetrics } from './lib/actions';
import SharesTable from './components/SharesTable';
import { getTranslations } from 'next-intl/server';

export default async function SharedPage() {
  const { user } = await getCurrentSession();
  if (user === null) return null;

  const tNavigation = await getTranslations('Navigation');
  const t = await getTranslations('SharedPage');
  const shares = await getSharesWithMetrics();

  const totalReaders = shares.reduce((acc, share) => acc + share.metrics.total, 0);

  const breadcrumbs = [
    { name: tNavigation('home'), href: '/' },
    { name: tNavigation('shared'), href: '/shared' }
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        description={t('description', { totalReaders })}
        breadcrumbs={breadcrumbs}
      />
      <PageBody>
        <SharesTable shares={shares} />
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
