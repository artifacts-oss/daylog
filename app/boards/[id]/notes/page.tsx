import { getSettings } from '@/app/admin/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import NavHeader from '@/components/NavHeader';
import NavMenu from '@/components/NavMenu';
import Page from '@/components/Page';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { IconInfoCircle, IconPlus } from '@tabler/icons-react';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getBoard } from '../../lib/actions';
import NoteCard from './components/NoteCard';
import NoteModalForm from './components/NoteModalForm';
import NoteCardPlaceholder from './components/NotePlaceholder';
import NoteSortSelector from './components/NoteSortSelector';
import { getNotes, getNotesCount } from './lib/actions';
import Link from 'next/link';

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
  const { sort = user.sortNotesBy, perPage = 12, openNew = 'false' } = await searchParams;
  const board = await getBoard(parseInt(id));

  if (!board) {
    return redirect('/boards');
  }

  const currentSort = sort as string;
  const currentPerPage = perPage as string;
  const openNewNote = openNew === 'true';
  const notesCount = await getNotesCount(parseInt(id));
  const notes = await getNotes(currentSort, parseInt(currentPerPage), parseInt(id));
  const settings = await getSettings();
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Boards', href: '/boards' },
    { name: board?.title ?? 'Notes', href: `/boards/${id}/notes` },
  ];

  return (
    <Page>
      <NavMenu></NavMenu>
      <NavHeader></NavHeader>
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
          <div className="d-flex flex-column flex-md-row w-full w-md-auto align-items-center justify-content-md-between gap-1 gap-md-3">
            <NoteSortSelector
              sortingParam={currentSort}
              boardId={parseInt(id)}
            />
            <div className="btn-list">
              <button
                accessKey="n"
                id="new-note-button"
                className="btn btn-primary"
                data-bs-toggle="modal"
                data-bs-target="#new-note-modal"
              >
                <IconPlus size={20} />
                <span className="ms-1">Create new note</span>
                <div className="d-flex gap-1 ms-1 d-none d-md-inline-flex">
                  <span className="badge bg-transparent badge-md border border-light text-light">
                    Alt
                  </span>
                  <span className="badge bg-transparent badge-md border border-light text-light">
                    N
                  </span>
                </div>
              </button>
              <NoteModalForm
                boardId={parseInt(id)}
                modalId="new-note-modal"
                mode="create"
                open={openNewNote}
                isUnsplashAllowed={settings?.allowUnsplash}
              ></NoteModalForm>
            </div>
          </div>
        </PageHeader>
        <PageBody>
          <div className="d-flex flex-column justify-content-between">
            <div className="masonry-container">
              {notes?.length == 0 ? (
                <div className="masonry-item">
                  <div className="card">
                    <div className="card-body">
                      <h5 className="card-title">Your notes are empty</h5>
                      <div className="d-flex flex-row gap-2">
                        <span>
                          <IconInfoCircle />
                        </span>
                        <p className="card-text">
                          Create a new one clicking{' '}
                          <strong>Create new note</strong> button or using{' '}
                          <span className="badge bg-info text-white">
                            Alt + N
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                notes?.map((b) => (
                  <div key={b.id} className="masonry-item">
                    <Suspense fallback={<NoteCardPlaceholder />}>
                      <NoteCard noteId={b.id}></NoteCard>
                    </Suspense>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 d-flex flex-column justify-content-center">
              <p className="text-center">Showing {notes?.length} of {notesCount} notes</p>
              {parseInt(currentPerPage) < notesCount &&
                <Link className="btn btn-ghost btn-primary mx-auto"
                  href={`/boards/${id}/notes?perPage=${parseInt(currentPerPage) * 2}`}>
                  Load more
                </Link>}
            </div>
          </div>
        </PageBody>
        <PageFooter></PageFooter>
      </PageContainer>
    </Page>
  );
}
