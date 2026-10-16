import NotesGrid from '@/app/partials/NotesGrid';
import { getNotes } from '@/app/(authenticated)/boards/[id]/notes/lib/actions';

export default async function NotesSection() {
  const notes = await getNotes('created_desc', 20, null);

  return <NotesGrid notes={notes ?? []} />;
}
