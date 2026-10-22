import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Attachment } from '@/prisma/generated/client';
import AttachmentSidebar from './AttachmentSidebar';
import { saveAttachment, deleteAttachment } from '../../lib/actions';

vi.mock('../../lib/actions', () => ({
  saveAttachment: vi.fn(),
  deleteAttachment: vi.fn(),
}));

const makeAttachment = (overrides: Partial<Attachment> = {}): Attachment => ({
  id: 1,
  notesId: 7,
  fileUrl: 'local/a.txt',
  fileName: 'a.txt',
  mimeType: 'text/plain',
  size: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

afterEach(cleanup);

describe('AttachmentSidebar', () => {
  const onAttachmentsChange = vi.fn();
  const onInsertLink = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSidebar = (attachments: Attachment[] = []) =>
    render(
      <AttachmentSidebar
        noteId={7}
        attachments={attachments}
        onAttachmentsChange={onAttachmentsChange}
        onInsertLink={onInsertLink}
        onClose={onClose}
      />,
    );

  const fileInput = (container: HTMLElement) =>
    container.querySelector<HTMLInputElement>('input[type="file"]')!;

  it('formats attachment sizes', () => {
    renderSidebar([
      makeAttachment({ id: 1, fileName: 'zero', size: 0 }),
      makeAttachment({ id: 2, fileName: 'bytes', size: 500 }),
      makeAttachment({ id: 3, fileName: 'kb', size: 1536 }),
      makeAttachment({ id: 4, fileName: 'mb', size: 5 * 1024 * 1024 }),
    ]);

    expect(screen.getByText('0 B')).toBeInTheDocument();
    expect(screen.getByText('500 B')).toBeInTheDocument();
    expect(screen.getByText('1.5 KB')).toBeInTheDocument();
    expect(screen.getByText('5.0 MB')).toBeInTheDocument();
  });

  it('resolves download URLs per storage backend', () => {
    renderSidebar([
      makeAttachment({ id: 1, fileUrl: 'https://cdn.x/y.pdf' }),
      makeAttachment({ id: 2, fileUrl: 'S3/key.pdf' }),
      makeAttachment({ id: 3, fileUrl: 'local/z.pdf' }),
    ]);

    const hrefs = screen.getAllByTitle('Download').map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      'https://cdn.x/y.pdf',
      '/api/v1/storage?key=S3/key.pdf',
      '/api/v1/images?filePath=local/z.pdf',
    ]);
  });

  it('inserts a link with the resolved URL', async () => {
    const user = userEvent.setup();
    renderSidebar([makeAttachment({ fileName: 'doc.pdf', fileUrl: 'S3/doc.pdf' })]);

    await user.click(screen.getByTitle('Insert link at cursor'));

    expect(onInsertLink).toHaveBeenCalledWith('doc.pdf', '/api/v1/storage?key=S3/doc.pdf');
  });

  it('uploads the selected file as a data URL and notifies on success', async () => {
    vi.mocked(saveAttachment).mockResolvedValue({ success: true } as never);
    const user = userEvent.setup();
    const { container } = renderSidebar();

    await user.upload(fileInput(container), new File(['hello'], 'hello.txt', { type: 'text/plain' }));

    await waitFor(() => expect(onAttachmentsChange).toHaveBeenCalledTimes(1));
    expect(saveAttachment).toHaveBeenCalledWith({
      noteId: 7,
      fileName: 'hello.txt',
      fileDataUrl: expect.stringMatching(/^data:text\/plain;base64,/),
    });
  });

  it('shows the server error and does not notify when the upload is rejected', async () => {
    vi.mocked(saveAttachment).mockResolvedValue({ success: false, error: 'Too big' } as never);
    const user = userEvent.setup();
    const { container } = renderSidebar();

    await user.upload(fileInput(container), new File(['x'], 'x.txt'));

    expect(await screen.findByText('Too big')).toBeInTheDocument();
    expect(onAttachmentsChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upload Attachment' })).toBeEnabled();
  });

  it('shows a generic error when the upload throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(saveAttachment).mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    const { container } = renderSidebar();

    await user.upload(fileInput(container), new File(['x'], 'x.txt'));

    expect(
      await screen.findByText('An error occurred while uploading the file.'),
    ).toBeInTheDocument();
    expect(onAttachmentsChange).not.toHaveBeenCalled();
  });

  it('deletes an attachment then notifies', async () => {
    vi.mocked(deleteAttachment).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSidebar([makeAttachment({ id: 42 })]);

    await user.click(screen.getByTitle('Delete attachment'));

    await waitFor(() => expect(onAttachmentsChange).toHaveBeenCalledTimes(1));
    expect(deleteAttachment).toHaveBeenCalledWith(7, 42);
  });

  it('does not notify when deletion fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deleteAttachment).mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderSidebar([makeAttachment({ id: 42 })]);

    await user.click(screen.getByTitle('Delete attachment'));

    await waitFor(() => expect(deleteAttachment).toHaveBeenCalled());
    expect(onAttachmentsChange).not.toHaveBeenCalled();
  });
});
