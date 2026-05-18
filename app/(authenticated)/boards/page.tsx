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
import { getTranslations } from 'next-intl/server';

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
  const tNav = await getTranslations('Navigation');
  const t = await getTranslations('BoardsPage');

  const breadcrumbs = [
    { name: tNav('home'), href: '/' },
    { name: tNav('boards'), href: '/boards' },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        description={t('description', { count: boardCount })}
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 w-full">
          <BoardSortSelector sortingParam={currentSort} />
          <BoardModalForm
            mode="create"
            open={openNewBoard}
            modalId="new-board-modal"
            isUnsplashAllowed={settings?.allowUnsplash}
            trigger={
              <Button
                id="new-board-button"
                className="flex-1 sm:flex-none sm:w-auto rounded-xl px-3 sm:px-6 gap-2 bg-primary hover:bg-primary/90 transition-all font-bold text-primary-foreground shrink-0"
              >
                <PlusIcon className="h-5 w-5" />
                <span className="hidden sm:inline">{t('newBoard')}</span>
                <span className="sm:hidden">{t('newShort')}</span>
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
                {t('emptyTitle')}
              </h3>
              <p className="text-[16px] text-muted-foreground font-[400] max-w-sm mx-auto mb-8">
                {t('emptyDescription')}
              </p>
              <BoardModalForm
                mode="create"
                modalId="new-board-modal-empty"
                isUnsplashAllowed={settings?.allowUnsplash}
                trigger={
                  <Button className="rounded-xl px-8 font-bold transition-all text-primary-foreground">
                    {t('createFirst')}
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
                {t('showing', { shown: boards.length, total: boardCount })}
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
                    {t('loadMore')}
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
