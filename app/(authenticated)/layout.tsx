import { getCurrentSession } from '@/app/login/lib/actions';
import { redirect } from 'next/navigation';
import NavSidebar from '@/components/NavSidebar';
import NavHeader from '@/components/NavHeader';
import Page from '@/components/Page';
import MainContent from '@/components/MainContent';
import { getAvailableUpdate } from './lib/version';
import { getTopItems } from './lib/actions';
import { getBoards } from './boards/lib/actions';
import QuickNote from '@/components/QuickNote';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();

  if (user === null) {
    return redirect('/login');
  }

  const [update, favorites, recent, boards] = await Promise.all([
    user.role === 'admin' ? getAvailableUpdate() : null,
    getTopItems(true),
    getTopItems(false),
    // Most recently updated first: the quick-note default target.
    getBoards('updated_desc', 50),
  ]);
  const boardOptions = (boards ?? []).map(({ id, title }) => ({ id, title }));

  return (
    <Page>
      <NavSidebar
        user={user}
        update={update}
        quickLinks={{ favorites, recent }}
        boards={boardOptions}
      />
      <MainContent>
<NavHeader user={user} update={update} />
        {children}
      </MainContent>
      <QuickNote boards={boardOptions} />
    </Page>
  );
}
