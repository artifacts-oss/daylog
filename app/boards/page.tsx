import BoardCard from '@/app/boards/components/BoardCard';
import BoardModalForm from '@/app/boards/components/BoardModalForm';
import BoardCardPlaceholder from '@/app/boards/components/BoardPlaceholder';
import NavHeader from '@/components/NavHeader';
import NavMenu from '@/components/NavMenu';
import Page from '@/components/Page';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import MainContent from '@/components/MainContent';
import { PlusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getSettings } from '../admin/lib/actions';
import { getCurrentSession } from '../login/lib/actions';
import BoardSortSelector from './components/BoardSortSelector';
import { getBoards, getBoardsCount } from './lib/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Boards({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
  }
  const {
    sort = user.sortBoardsBy,
    perPage = 12,
    openNew = 'false',
  } = await searchParams;
  const currentSort = sort as string;
  const currentPage = perPage as string;
  const openNewBoard = openNew === 'true';
  const boardCount = await getBoardsCount();
  const boards = await getBoards(currentSort, parseInt(currentPage));
  const settings = await getSettings();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Boards', href: '/boards' },
  ];

  return (
    <Page>
      <NavMenu user={user} />
      <MainContent>
        <NavHeader user={user} />
        <PageContainer>
          <PageHeader
            title="All boards"
            description="You can view all the boards you've created here."
            breadcrumbs={breadcrumbs}
          >
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <BoardSortSelector sortingParam={currentSort} />
              <Button id="new-board-button" className="gap-2">
                <PlusIcon className="h-5 w-5" />
                <span>Create new board</span>
                <div className="hidden md:flex items-center gap-1 ml-1 text-xs">
                  <kbd className="px-1.5 py-0.5 bg-primary-foreground/20 rounded">
                    Alt
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-primary-foreground/20 rounded">
                    N
                  </kbd>
                </div>
              </Button>
              <BoardModalForm
                mode="create"
                open={openNewBoard}
                modalId="new-board-modal"
                isUnsplashAllowed={settings?.allowUnsplash}
              />
            </div>
          </PageHeader>
          <PageBody>
            <div className="flex flex-col gap-6">
              {boards?.length === 0 ? (
                <div className="max-w-sm">
                  <div className="rounded-lg border bg-card p-4">
                    <h5 className="font-semibold mb-2">
                      Your boards are empty
                    </h5>
                    <div className="flex gap-2 text-muted-foreground text-sm">
                      <InformationCircleIcon className="h-5 w-5 flex-shrink-0" />
                      <p>
                        Create a new one by clicking{' '}
                        <strong>Create new board</strong> or using{' '}
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          Alt + N
                        </kbd>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {boards?.map((b) => (
                    <Suspense key={b.id} fallback={<BoardCardPlaceholder />}>
                      <BoardCard boardId={b.id} />
                    </Suspense>
                  ))}
                </div>
              )}
              {boards && boards.length > 0 && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {boards.length} of {boardCount} boards
                  </p>
                  {parseInt(currentPage) < boardCount && (
                    <Link href={`/boards?perPage=${parseInt(currentPage) * 2}`}>
                      <Button variant="outline">Load more</Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </PageBody>
          <PageFooter />
        </PageContainer>
      </MainContent>
    </Page>
  );
}
