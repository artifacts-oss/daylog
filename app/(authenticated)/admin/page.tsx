import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getCurrentSession } from '@/app/login/lib/actions';
import { getSettings } from './lib/actions';
import { redirect } from 'next/navigation';
import AdminTabs from './partials/AdminTabs';

export default async function Admin() {
  const { user } = await getCurrentSession();

  if (user === null) {
    return redirect('/login');
  }

  if (user.role !== 'admin') {
    return redirect('/');
  }

  const initialSettings = await getSettings();

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Admin', href: '/admin' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Configuration"
        description="Manage your users and preferences"
        breadcrumbs={breadcrumbs}
      />
      <PageBody>
        <AdminTabs currentUser={user} initialSettings={initialSettings} />
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
