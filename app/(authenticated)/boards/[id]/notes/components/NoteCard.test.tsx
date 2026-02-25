import { truncateWord } from '@/utils/text';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NoteCard from './NoteCard';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { fill, priority, sizes, ...rest } = props;
    return <img {...rest} />;
  },
}));

vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: (url: string) => url,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial,
      animate,
      exit,
      transition,
      layout,
      ...rest
    }: any) => <div {...rest}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock(
  '@/app/(authenticated)/boards/[id]/notes/components/NoteModalForm',
  () => ({
    default: () => <div data-testid="note-modal-form" />,
  }),
);

vi.mock(
  '@/app/(authenticated)/boards/[id]/notes/components/NoteModalDelete',
  () => ({
    default: () => <div data-testid="note-modal-delete" />,
  }),
);

vi.mock(
  '@/app/(authenticated)/boards/[id]/notes/components/NoteFavoriteButton',
  () => ({
    default: ({ note }: any) =>
      note.favorite ? (
        <div data-testid="filled-heart" />
      ) : (
        <div data-testid="empty-heart" />
      ),
  }),
);

describe('NoteCard', () => {
  const mockNote = {
    id: 1,
    title: 'Test Note',
    content: 'This is a test note',
    favorite: true,
    imageUrl: 'test-image-url',
    boardsId: 1,
    updatedAt: new Date(),
    boards: { id: 1, title: 'Test Board' },
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    render(<NoteCard note={mockNote as any} />);

    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('displays the favorite icon filled if the note is marked as favorite', () => {
    render(<NoteCard note={mockNote as any} />);

    expect(screen.getByTestId('filled-heart')).toBeInTheDocument();
  });

  it('displays the note image if imageUrl is provided', () => {
    render(<NoteCard note={mockNote as any} />);

    expect(screen.getByAltText('Test Note')).toBeInTheDocument();
  });

  it('displays the note title', () => {
    render(<NoteCard note={mockNote as any} />);

    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('displays the note content', () => {
    render(<NoteCard note={mockNote as any} />);

    expect(screen.getByText('This is a test note')).toBeInTheDocument();
  });

  it('displays the TimeDiff component with the correct updatedAt prop', () => {
    render(<NoteCard note={mockNote as any} />);

    const relativeTimeElement = document.querySelector('relative-time');
    expect(relativeTimeElement).toBeInTheDocument();
  });
});
