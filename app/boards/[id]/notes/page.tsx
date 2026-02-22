import { getSettings } from '@/app/admin/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import NavHeader from '@/components/NavHeader';
import NavMenu from '@/components/NavMenu';
import Page from '@/components/Page';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import MainContent from '@/components/MainContent';
import { InformationCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getBoard } from '../../lib/actions';
import NoteCard from './components/NoteCard';
import NoteModalForm from './components/NoteModalForm';
import NoteCardPlaceholder from './components/NotePlaceholder';
import NoteSortSelector from './components/NoteSortSelector';
import { getNotes, getNotesCount } from './lib/actions';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Notes({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
  }
  const { id } = await params;
  const {
    sort = user.sortNotesBy,
    perPage = 12,
    openNew = 'false',
  } = await searchParams;
  const board = await getBoard(parseInt(id));

  if (!board) {
    return redirect('/boards');
  }

  const currentSort = sort as string;
  const currentPerPage = perPage as string;
  const openNewNote = openNew === 'true';
  const notesCount = await getNotesCount(parseInt(id));
  const notes = await getNotes(
    currentSort,
    parseInt(currentPerPage),
    parseInt(id),
  );
  const settings = await getSettings();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Boards', href: '/boards' },
    { name: board?.title ?? 'Notes', href: `/boards/${id}/notes` },
  ];

  return (
    <Page>
      <NavMenu user={user} />
      <MainContent>
        <NavHeader user={user} />
        <PageContainer>
          <PageHeader
            title={board?.title}
            description={
              board?.updatedAt
                ? `Created on ${new Intl.DateTimeFormat('default', { dateStyle: 'medium' }).format(board.createdAt)} at ${new Intl.DateTimeFormat('default', { timeStyle: 'short' }).format(board.createdAt)}`
                : undefined
            }
            imageUrl={board?.imageUrl}
            breadcrumbs={breadcrumbs}
          >
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <NoteSortSelector
                sortingParam={currentSort}
                boardId={parseInt(id)}
              />
              <Button id="new-note-button" className="gap-2">
                <PlusIcon className="h-5 w-5" />
                <span>Create new note</span>
                <div className="hidden md:flex items-center gap-1 ml-1 text-xs">
                  <kbd className="px-1.5 py-0.5 bg-primary-foreground/20 rounded">
                    Alt
                  </kbd>
                  <kbd className="px-1.5 py-0.5 bg-primary-foreground/20 rounded">
                    N
                  </kbd>
                </div>
              </Button>
              <NoteModalForm
                boardId={parseInt(id)}
                modalId="new-note-modal"
                mode="create"
                open={openNewNote}
                isUnsplashAllowed={settings?.allowUnsplash}
              />
            </div>
          </PageHeader>
          <PageBody>
            <div className="flex flex-col gap-6">
              {notes?.length === 0 ? (
                <div className="max-w-sm">
                  <div className="rounded-lg border bg-card p-4">
                    <h5 className="font-semibold mb-2">Your notes are empty</h5>
                    <div className="flex gap-2 text-muted-foreground text-sm">
                      <InformationCircleIcon className="h-5 w-5 flex-shrink-0" />
                      <p>
                        Create a new one by clicking{' '}
                        <strong>Create new note</strong> or using{' '}
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">
                          Alt + N
                        </kbd>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="masonry-container">
                  {notes?.map((b) => (
                    <div key={b.id} className="masonry-item">
                      <Suspense fallback={<NoteCardPlaceholder />}>
                        <NoteCard noteId={b.id} />
                      </Suspense>
                    </div>
                  ))}
                </div>
              )}
              {notes && notes.length > 0 && (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {notes.length} of {notesCount} notes
                  </p>
                  {parseInt(currentPerPage) < notesCount && (
                    <Link
                      href={`/boards/${id}/notes?perPage=${parseInt(currentPerPage) * 2}`}
                    >
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
