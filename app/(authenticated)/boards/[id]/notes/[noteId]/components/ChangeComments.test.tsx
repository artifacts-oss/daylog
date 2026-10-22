import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChangeComments from './ChangeComments';
import { addChangeComment } from '../../lib/actions';

vi.mock('../../lib/actions', () => ({
  addChangeComment: vi.fn(),
}));

type Props = Parameters<typeof ChangeComments>[0];
type Comment = Props['comments'][number];

const makeComment = (id: number, userId: number, content: string): Comment => ({
  id,
  changeId: 1,
  userId,
  content,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  user: { id: userId, name: `User ${userId}`, email: `u${userId}@x.com`, profileImage: null },
});

afterEach(cleanup);

describe('ChangeComments', () => {
  const onRefresh = vi.fn();
  const onDeleteRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComments = (props: Partial<Props> = {}) =>
    render(
      <ChangeComments
        changeId={1}
        comments={[]}
        onRefresh={onRefresh}
        onDeleteRequest={onDeleteRequest}
        {...props}
      />,
    );

  it('shows the empty state without comments', () => {
    renderComments();
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
  });

  it('submits the trimmed comment, clears the input and refreshes', async () => {
    vi.mocked(addChangeComment).mockResolvedValue({ id: 5 } as never);
    const user = userEvent.setup();
    renderComments();

    const input = screen.getByPlaceholderText('Add a comment...');
    await user.type(input, '  hello  ');
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(addChangeComment).toHaveBeenCalledWith(1, 'hello'));
    expect(input).toHaveValue('');
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not submit whitespace-only input', async () => {
    const user = userEvent.setup();
    renderComments();

    await user.type(screen.getByPlaceholderText('Add a comment...'), '   ');

    expect(addChangeComment).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('keeps the text and does not refresh when the server rejects the comment', async () => {
    vi.mocked(addChangeComment).mockResolvedValue(null);
    const user = userEvent.setup();
    renderComments();

    const input = screen.getByPlaceholderText('Add a comment...');
    await user.type(input, 'hello');
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => expect(addChangeComment).toHaveBeenCalled());
    expect(input).toHaveValue('hello');
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('lets only the author delete a comment', async () => {
    const user = userEvent.setup();
    renderComments({
      comments: [makeComment(10, 1, 'mine'), makeComment(11, 2, 'theirs')],
      currentUserId: 1,
    });

    const buttons = screen.getAllByTitle('Delete comment');
    expect(buttons).toHaveLength(1);
    await user.click(buttons[0]);

    expect(onDeleteRequest).toHaveBeenCalledWith(10);
  });

  it('lets the note owner delete any comment', async () => {
    const user = userEvent.setup();
    renderComments({
      comments: [makeComment(10, 1, 'a'), makeComment(11, 2, 'b')],
      currentUserId: 99,
      isNoteOwner: true,
    });

    const buttons = screen.getAllByTitle('Delete comment');
    expect(buttons).toHaveLength(2);
    await user.click(buttons[1]);

    expect(onDeleteRequest).toHaveBeenCalledWith(11);
  });

  it('hides delete for users who are neither author nor owner', () => {
    renderComments({ comments: [makeComment(10, 1, 'a')], currentUserId: 2 });
    expect(screen.queryByTitle('Delete comment')).not.toBeInTheDocument();
  });
});
