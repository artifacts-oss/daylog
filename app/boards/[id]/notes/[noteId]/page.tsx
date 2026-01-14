import { getBoard } from '@/app/boards/lib/actions';
import { getCurrentSession } from '@/app/login/lib/actions';
import NavHeader from '@/components/NavHeader';
import NavMenu from '@/components/NavMenu';
import Page from '@/components/Page';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { redirect } from 'next/navigation';
import { getNote } from '../lib/actions';
import Editor from './components/Editor';

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
  }
  const board = await getBoard(parseInt((await params).id));
  const note = await getNote(parseInt((await params).noteId));

  if (!board) {
    return redirect('/boards');
  }

  if (!note) {
    return redirect(`/boards/${board?.id}/notes`);
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Boards', href: '/boards' },
    { name: board?.title ?? 'Notes', href: `/boards/${note?.boardsId}/notes` },
    {
      name: note?.title ?? '',
      href: `/boards/${note?.boardsId}/notes/${note?.id}`,
    },
  ];

  return (
    <Page>
      <NavMenu></NavMenu>
      <NavHeader></NavHeader>
      <PageContainer>
        <PageHeader
          title={note?.title}
          description={
            note?.updatedAt
              ? `Last updated on ${new Intl.DateTimeFormat('default', {
                  dateStyle: 'medium',
                }).format(note.updatedAt)} at ${new Intl.DateTimeFormat(
                  'default',
                  { timeStyle: 'short' }
                ).format(note.updatedAt)}`
              : undefined
          }
          imageUrl={note?.imageUrl}
          breadcrumbs={breadcrumbs}
        ></PageHeader>
        <PageBody>{note && <Editor note={note} />}</PageBody>
        <PageFooter></PageFooter>
      </PageContainer>
    </Page>
  );
}
