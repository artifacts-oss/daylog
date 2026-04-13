import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getCurrentSession } from '@/app/login/lib/actions';
import { getSharesWithMetrics } from './lib/actions';
import SharesTable from './components/SharesTable';

export default async function SharedPage() {
  const { user } = await getCurrentSession();
  if (user === null) return null;

  const shares = await getSharesWithMetrics();
  
  const totalReaders = shares.reduce((acc, share) => acc + share.metrics.total, 0);

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Shared', href: '/shared' }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Shared Content"
        description={`Manage your shared notes and boards. Total unique readers: ${totalReaders}`}
        breadcrumbs={breadcrumbs}
      />
      <PageBody>
        <SharesTable shares={shares} />
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
