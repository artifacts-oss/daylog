import { getBoard, getBoardForNoteRecipient } from '@/app/(authenticated)/boards/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getNote, getEditShareForNote, getNoteForRecipient } from '../lib/actions';
import CollabEditor from './components/CollabEditor';
import { prisma } from '@/prisma/client';
import { getImageUrlOrFile } from '@/utils/image';
import ShareDialog from '@/components/ShareDialog';
import { getEntityPublicShare } from '@/app/(authenticated)/shared/lib/actions';
import { getLocale, getTranslations } from 'next-intl/server';

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
  let board = await getBoard(parseInt(id));
  let note = await getNote(parseInt(noteId));
  const tNav = await getTranslations('Navigation');
  const tNotes = await getTranslations('NotesPage');
  const t = await getTranslations('NoteDetailPage');
  const locale = await getLocale();

  // If user isn't the owner, check if they have a canEdit share for this note
  let canEditViaShare = false;
  if (!note) {
    const editShare = await getEditShareForNote(parseInt(noteId));
    if (editShare) {
      note = await getNoteForRecipient(parseInt(noteId));
      board = board ?? await getBoardForNoteRecipient(parseInt(noteId));
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
