import BoardCard from '@/app/(authenticated)/boards/components/BoardCard';
import BoardModalForm from '@/app/(authenticated)/boards/components/BoardModalForm';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { PlusIcon, FaceSmileIcon } from '@heroicons/react/24/outline';
import { getSettings } from '@/app/(authenticated)/admin/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
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
    return null;
  }
  const {
    sort = user.sortBoardsBy || 'created_desc',
    perPage = 12,
    openNew = 'false',
  } = await searchParams;

  const currentSort = sort as string;
  const currentPerPage = parseInt(perPage as string);
  const openNewBoard = openNew === 'true';
  const boardCount = await getBoardsCount();
  const boards = await getBoards(currentSort, currentPerPage);
  const settings = await getSettings();

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Boards', href: '/boards' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Your Boards"
        description={`You have curated ${boardCount} collection${
          boardCount === 1 ? '' : 's'
        } so far. Manage and organize your ideas here.`}
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center gap-3">
          <BoardSortSelector sortingParam={currentSort} />
          <BoardModalForm
            mode="create"
            open={openNewBoard}
            modalId="new-board-modal"
            isUnsplashAllowed={settings?.allowUnsplash}
            trigger={
              <Button
                id="new-board-button"
                className="rounded-xl px-6 gap-2 bg-primary hover:bg-primary/90 transition-all font-bold text-primary-foreground"
              >
                <PlusIcon className="h-5 w-5" />
                <span>New Board</span>
                <div className="hidden lg:flex items-center gap-1 ml-2 opacity-50 text-[10px] font-bold uppercase tracking-widest">
                  <kbd className="min-w-[2rem] h-5 inline-flex items-center justify-center px-1 bg-background/20 rounded tracking-normal leading-none">
                    Alt
                  </kbd>
                  <span>+</span>
                  <kbd className="w-5 h-5 inline-flex items-center justify-center bg-background/20 rounded tracking-normal leading-none">
                    N
                  </kbd>
                </div>
              </Button>
            }
          />
        </div>
      </PageHeader>

      <PageBody>
        <div className="flex flex-col gap-12 py-4">
          {!boards || boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-accent rounded-[20px] border-2 border-dashed border-border">
              <div className="p-4 rounded-full bg-background mb-4 shadow-sm text-muted-foreground">
                <FaceSmileIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-[24px] font-[700] mb-2 text-foreground">
                No boards found
              </h3>
              <p className="text-[16px] text-muted-foreground font-[400] max-w-sm mx-auto mb-8">
                Create your first board to start organizing your notes and
                thoughts.
              </p>
              <BoardModalForm
                mode="create"
                modalId="new-board-modal-empty"
                isUnsplashAllowed={settings?.allowUnsplash}
                trigger={
                  <Button className="rounded-xl px-8 font-bold transition-all text-primary-foreground">
                    Create My First Board
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((b) => (
                <BoardCard key={b.id} boardId={b.id} />
              ))}
            </div>
          )}

          {boards && boards.length > 0 && (
            <div className="flex flex-col items-center gap-4 pt-8">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                Showing {boards.length} of {boardCount} boards
              </p>
              {currentPerPage < boardCount && (
                <Link
                  href={`/boards?perPage=${currentPerPage + 12}`}
                  scroll={false}
                >
                  <Button
                    variant="outline"
                    className="rounded-full px-12 border-primary/10 hover:border-primary/30 bg-background/50 backdrop-blur-sm transition-all"
                  >
                    Load More Boards
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
