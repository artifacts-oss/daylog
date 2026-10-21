import { getBoard, getBoardForNoteRecipient } from '@/app/(authenticated)/boards/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getNote, getEditShareForNote, getNoteForRecipient, renameNote } from '../lib/actions';
import InlineTitleEditor from '@/components/InlineTitleEditor';
import NoteModalDelete from '../components/NoteModalDelete';
import CollabEditor from './components/CollabEditor';
import { prisma } from '@/prisma/client';
import { getImageUrlOrFile } from '@/utils/image';
import { Button } from '@/components/ui/button';
import { TrashIcon } from '@heroicons/react/24/outline';
import ShareDialog from '@/components/ShareDialog';
import { getEntityPublicShare } from '@/app/(authenticated)/shared/lib/actions';
import { getLocale, getTranslations } from 'next-intl/server';
import { parseId } from '@/utils/parseId';

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return null;
  }
  const { id, noteId } = await params;
  const boardId = parseId(id);
  const parsedNoteId = parseId(noteId);
  if (Number.isNaN(boardId) || Number.isNaN(parsedNoteId)) {
    return null;
  }
  let board = await getBoard(boardId);
  let note = await getNote(parsedNoteId);
  const tNav = await getTranslations('Navigation');
  const tNotes = await getTranslations('NotesPage');
  const t = await getTranslations('NoteDetailPage');
  const tDelete = await getTranslations('NoteDelete');
  const locale = await getLocale();

  // If user isn't the owner, check if they have a canEdit share for this note
  let canEditViaShare = false;
  if (!note) {
    const editShare = await getEditShareForNote(parsedNoteId);
    if (editShare) {
      note = await getNoteForRecipient(parsedNoteId);
      board = board ?? await getBoardForNoteRecipient(parsedNoteId);
      canEditViaShare = true;
    }
  }

  if (!board || !note) {
    return null;
  }

  const _noteShare = await getEntityPublicShare('NOTE', note.id);

  const hasEditShare = !!(await prisma.share.findFirst({
    where: { entityType: 'NOTE', entityId: note.id, canEdit: true, scope: 'SPECIFIC' },
  }));
  const enableCollab = hasEditShare;

  const breadcrumbs = canEditViaShare
    ? [
        { name: tNav('community'), href: '/community' },
        { name: note?.title ?? '', href: `/boards/${board.id}/notes/${note.id}` },
      ]
    : [
        { name: tNav('home'), href: '/' },
        { name: tNav('boards'), href: '/boards' },
        { name: board?.title ?? tNotes('fallback'), href: `/boards/${board.id}/notes` },
        { name: note?.title ?? '', href: `/boards/${board.id}/notes/${note.id}` },
      ];

  return (
    <PageContainer>
      <PageHeader
        title={note?.title}
        titleSlot={
          board.userId === user.id && !canEditViaShare ? (
            <InlineTitleEditor
              title={note.title}
              onRename={renameNote.bind(null, note.id)}
            />
          ) : undefined
        }
        description={
          note?.updatedAt
            ? t('updatedAt', {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                }).format(note.updatedAt),
                time: new Intl.DateTimeFormat(locale, {
                  timeStyle: 'short',
                }).format(note.updatedAt),
              })
            : undefined
        }
        imageUrl={
          note?.imageUrl
            ? getImageUrlOrFile(encodeURI(note.imageUrl))
            : undefined
        }
        breadcrumbs={breadcrumbs}
      >
        <div className="flex items-center gap-1.5 sm:gap-3">
          <ShareDialog entityType="NOTE" entityId={note.id} />
          {board.userId === user.id && !canEditViaShare && (
            <NoteModalDelete
              note={note}
              redirectTo={`/boards/${board.id}/notes`}
              trigger={
                <Button variant="outline" className="h-12 w-12 px-0 rounded-xl bg-background/50 backdrop-blur-sm border-border hover:bg-muted transition-all shrink-0 shadow-sm">
                  <TrashIcon className="h-4 w-4 text-destructive shrink-0" />
                  <span className="sr-only">{tDelete('delete')}</span>
                </Button>
              }
            />
          )}
        </div>
      </PageHeader>
      <PageBody>
        {note && (
          <CollabEditor
            note={note}
            isOwner={board.userId === user.id || canEditViaShare}
            canDeleteHistory={board.userId === user.id}
            currentUserId={user.id}
            currentUserName={user.name ?? user.email ?? ''}
            enableCollab={enableCollab}
          />
        )}
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
