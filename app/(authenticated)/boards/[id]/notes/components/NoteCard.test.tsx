import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NoteWithBoards } from '../lib/types';
import NoteCard from './NoteCard';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...rest
  }: { children: React.ReactNode; href: string } & Record<string, unknown>) => (
    <a href={href} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, priority, sizes, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt="" {...(rest as Record<string, unknown>)} />;
  },
}));

vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: (url: string) => url,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...restProps }: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { initial, animate, exit, transition, layout, ...rest } = restProps;
      return (
        <div {...(rest as Record<string, unknown>)}>
          {children as React.ReactNode}
        </div>
      );
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
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
    default: ({ note }: { note: { favorite: boolean } }) =>
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
    createdAt: new Date(),
    updatedAt: new Date(),
    boards: { id: 1, title: 'Test Board' },
  };

  beforeEach(() => {
    cleanup();
  });

  it('renders without crashing', () => {
    render(<NoteCard note={mockNote as unknown as NoteWithBoards} />);

    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('displays the favorite icon filled if the note is marked as favorite', () => {
    render(<NoteCard note={mockNote as unknown as NoteWithBoards} />);

    expect(screen.getByTestId('filled-heart')).toBeInTheDocument();
  });

  it('displays the note image if imageUrl is provided', () => {
    render(<NoteCard note={mockNote as unknown as NoteWithBoards} />);

    expect(screen.getByAltText('Test Note')).toBeInTheDocument();
  });

  it('displays the note title', () => {
    render(<NoteCard note={mockNote as unknown as NoteWithBoards} />);

    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('displays the note content', () => {
    render(<NoteCard note={mockNote as unknown as NoteWithBoards} />);

    expect(screen.getByText('This is a test note')).toBeInTheDocument();
  });

  it('displays the TimeDiff component with the correct updatedAt prop', () => {
    render(<NoteCard note={mockNote as unknown as NoteWithBoards} />);

    const relativeTimeElement = document.querySelector('relative-time');
    expect(relativeTimeElement).toBeInTheDocument();
  });
});
