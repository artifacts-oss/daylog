import NotesGrid from '@/app/partials/NotesGrid';
import { getNotes } from '@/app/(authenticated)/boards/[id]/notes/lib/actions';

export default async function NotesSection({
  showFav,
}: {
  showFav: boolean;
}) {
  const notes = await getNotes('created_desc', 20);

  const filteredNotes =
    notes?.filter((note) => (showFav ? note.favorite : true)) || [];

  return <NotesGrid notes={filteredNotes} showFav={showFav} />;
}
