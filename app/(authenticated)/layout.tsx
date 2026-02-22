import { getCurrentSession } from '@/app/login/lib/actions';
import { redirect } from 'next/navigation';
import NavSidebar from '@/components/NavSidebar';
import NavHeader from '@/components/NavHeader';
import Page from '@/components/Page';
import MainContent from '@/components/MainContent';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCurrentSession();

  if (user === null) {
    return redirect('/login');
  }

  return (
    <Page>
      <NavSidebar user={user} />
      <MainContent>
        <NavHeader user={user} />
        {children}
      </MainContent>
    </Page>
  );
}
