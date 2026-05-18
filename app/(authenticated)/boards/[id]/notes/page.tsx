import { getSettings } from '@/app/(authenticated)/admin/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { PlusIcon, FaceSmileIcon } from '@heroicons/react/24/outline';
import { getBoard } from '@/app/(authenticated)/boards/lib/actions';
import NoteCard from './components/NoteCard';
import NoteModalForm from './components/NoteModalForm';
import NoteSortSelector from './components/NoteSortSelector';
import { getNotes, getNotesCount } from './lib/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getImageUrlOrFile } from '@/utils/image';
import ShareDialog from '@/components/ShareDialog';
import { getLocale, getTranslations } from 'next-intl/server';

export default async function Notes({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return null;
  }
  const { id } = await params;
  const boardId = parseInt(id);
  const {
    sort = user.sortNotesBy || 'created_desc',
    perPage = 12,
    openNew = 'false',
  } = await searchParams;

  const board = await getBoard(boardId);
  if (!board) {
    return null;
  }

  const currentSort = sort as string;
  const currentPerPage = parseInt(perPage as string);
  const openNewNote = openNew === 'true';
  const notesCount = await getNotesCount(boardId);
  const notes = await getNotes(currentSort, currentPerPage, boardId);
  const settings = await getSettings();
  const tNav = await getTranslations('Navigation');
  const t = await getTranslations('NotesPage');
  const locale = await getLocale();

  const breadcrumbs = [
    { name: tNav('home'), href: '/' },
    { name: tNav('boards'), href: '/boards' },
    { name: board?.title ?? t('fallback'), href: `/boards/${id}/notes` },
  ];

  return (
    <PageContainer>
      <PageHeader
        title={board?.title}
        description={t('description', {
          count: notesCount,
          date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(board.updatedAt),
        })}
        imageUrl={
          board?.imageUrl ? getImageUrlOrFile(encodeURI(board.imageUrl)) : null
        }
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 w-full">
          <ShareDialog entityType="BOARD" entityId={boardId} />
          <NoteSortSelector sortingParam={currentSort} boardId={boardId} />
          <NoteModalForm
            boardId={boardId}
            modalId="new-note-modal"
            mode="create"
            open={openNewNote}
            isUnsplashAllowed={settings?.allowUnsplash}
            trigger={
              <Button
                id="new-note-button"
                className="flex-1 sm:flex-none sm:w-auto rounded-xl px-3 sm:px-6 gap-2 bg-primary hover:bg-primary/90 transition-all font-bold text-primary-foreground shrink-0"
              >
                <PlusIcon className="h-5 w-5" />
                <span className="hidden sm:inline">{t('newNote')}</span>
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
          {notes?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center bg-muted/30 rounded-3xl border-2 border-dashed border-muted">
              <div className="p-4 rounded-full bg-background mb-4 shadow-sm text-muted-foreground">
                <FaceSmileIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('emptyTitle')}</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-8">
                {t('emptyDescription')}
              </p>
              <NoteModalForm
                boardId={boardId}
                modalId="new-note-modal-empty"
                mode="create"
                isUnsplashAllowed={settings?.allowUnsplash}
                trigger={
                  <Button className="rounded-xl px-8 font-bold transition-all text-primary-foreground">
                    {t('createFirst')}
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="masonry-container gap-6">
              {notes?.map((note) => (
                <div key={note.id} className="masonry-item mb-6">
                  <NoteCard note={note} settings={settings ?? undefined} />
                </div>
              ))}
            </div>
          )}

          {notes && notes.length > 0 && (
            <div className="flex flex-col items-center gap-4 pt-8">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                {t('showing', { shown: notes.length, total: notesCount })}
              </p>
              {currentPerPage < notesCount && (
                <Link
                  href={`/boards/${id}/notes?perPage=${currentPerPage + 12}`}
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
