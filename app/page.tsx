import NavHeader from '@/components/NavHeader';
import NavMenu from '@/components/NavMenu';
import Page from '@/components/Page';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { redirect } from 'next/navigation';
import BoardFavSwitch from './components/BoardFavToggle';
import { getBoardsCount } from './lib/actions';
import { getCurrentSession } from './login/lib/actions';
import HomeTabs from './partials/HomeTabs';
import MainContent from '@/components/MainContent';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
  }

  const boardsCount = await getBoardsCount();
  const { showFav = 'false' } = await searchParams;

  const breadcrumbs = [{ name: 'Home', href: '/' }];
  return (
    <Page>
      <NavMenu user={user} />
      <MainContent>
        <NavHeader user={user} />
        <PageContainer>
          <PageHeader
            title={`Welcome ${user.name}`}
            breadcrumbs={breadcrumbs}
            description={`Here is a quick look of your ${showFav === 'true' ? 'favorite' : 'recent'} boards`}
          >
            {boardsCount > 0 && (
              <div className="flex justify-end w-full md:w-auto">
                <BoardFavSwitch showFavParam={showFav === 'true'} />
              </div>
            )}
          </PageHeader>
          <PageBody>
            <HomeTabs showFav={showFav === 'true'} />
          </PageBody>
          <PageFooter />
        </PageContainer>
      </MainContent>
    </Page>
  );
}
