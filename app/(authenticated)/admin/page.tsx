import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getCurrentSession } from '@/app/login/lib/actions';
import { getSettings } from './lib/actions';
import { redirect } from 'next/navigation';
import AdminTabs from './partials/AdminTabs';
import { getTranslations } from 'next-intl/server';

export default async function Admin() {
  const { user } = await getCurrentSession();

  if (user === null) {
    return redirect('/login');
  }

  if (user.role !== 'admin') {
    return redirect('/');
  }

  const initialSettings = await getSettings();
  const tNav = await getTranslations('Navigation');
  const t = await getTranslations('AdminPage');

  const breadcrumbs = [
    { name: tNav('home'), href: '/' },
    { name: tNav('admin'), href: '/admin' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        description={t('description')}
        breadcrumbs={breadcrumbs}
      />
      <PageBody>
        <AdminTabs currentUser={user} initialSettings={initialSettings} />
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
