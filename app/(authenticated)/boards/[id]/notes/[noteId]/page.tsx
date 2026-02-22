import { getBoard } from '@/app/(authenticated)/boards/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getNote } from '../lib/actions';
import Editor from './components/Editor';
import { getImageUrlOrFile } from '@/utils/image';

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

  if (!board || !note) {
    return null;
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Boards', href: '/boards' },
    { name: board?.title ?? 'Notes', href: `/boards/${board.id}/notes` },
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
            ? `Last updated on ${new Intl.DateTimeFormat('default', {
                dateStyle: 'medium',
              }).format(note.updatedAt)} at ${new Intl.DateTimeFormat(
                'default',
                { timeStyle: 'short' },
              ).format(note.updatedAt)}`
            : undefined
        }
        imageUrl={
          note?.imageUrl
            ? getImageUrlOrFile(encodeURI(note.imageUrl))
            : undefined
        }
        breadcrumbs={breadcrumbs}
      />
      <PageBody>{note && <Editor note={note} />}</PageBody>
      <PageFooter />
    </PageContainer>
  );
}
