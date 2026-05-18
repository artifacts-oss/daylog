import { getBoard } from '@/app/(authenticated)/boards/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getNote } from '../lib/actions';
import Editor from './components/Editor';
import { getImageUrlOrFile } from '@/utils/image';
import ShareDialog from '@/components/ShareDialog';
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
  const board = await getBoard(parseInt(id));
  const note = await getNote(parseInt(noteId));
  const tNav = await getTranslations('Navigation');
  const tNotes = await getTranslations('NotesPage');
  const t = await getTranslations('NoteDetailPage');
  const locale = await getLocale();

  if (!board || !note) {
    return null;
  }

  const breadcrumbs = [
    { name: tNav('home'), href: '/' },
    { name: tNav('boards'), href: '/boards' },
    { name: board?.title ?? tNotes('fallback'), href: `/boards/${board.id}/notes` },
    {
      name: note?.title ?? '',
      href: `/boards/${board.id}/notes/${note.id}`,
    },
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
        <ShareDialog entityType="NOTE" entityId={note.id} />
      </PageHeader>
      <PageBody>
        {note && (
          <Editor
            note={note}
            isOwner={board.userId === user.id}
            currentUserId={user.id}
          />
        )}
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
