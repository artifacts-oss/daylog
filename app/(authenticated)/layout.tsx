import { getCurrentSession } from '@/app/login/lib/actions';
import { redirect } from 'next/navigation';
import NavSidebar from '@/components/NavSidebar';
import NavHeader from '@/components/NavHeader';
import Page from '@/components/Page';
import MainContent from '@/components/MainContent';
import { getAvailableUpdate } from './lib/version';
import { getTopItems } from './lib/actions';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();

  if (user === null) {
    return redirect('/login');
  }

  const [update, favorites, recent] = await Promise.all([
    user.role === 'admin' ? getAvailableUpdate() : null,
    getTopItems(true),
    getTopItems(false),
  ]);

  return (
    <Page>
      <NavSidebar user={user} update={update} quickLinks={{ favorites, recent }} />
      <MainContent>
        <NavHeader user={user} update={update} />
        {children}
      </MainContent>
    </Page>
  );
}
