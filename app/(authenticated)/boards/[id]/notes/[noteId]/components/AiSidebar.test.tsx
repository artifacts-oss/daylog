import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AiSidebar from './AiSidebar';
import { renderWithIntl } from '@/utils/test/renderWithIntl';

function streamResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return new Response(body, { status });
}

describe('AiSidebar', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('streams the result for the selected text and replaces it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(['Better ', 'text']));
    vi.stubGlobal('fetch', fetchMock);
    const onInsert = vi.fn();

    renderWithIntl(
      <AiSidebar
        noteId={7}
        getSource={() => ({ text: 'bad text', start: 4, end: 12 })}
        onInsert={onInsert}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Improve writing'));

    await waitFor(() =>
      expect(screen.getByTestId('ai-output').textContent).toBe('Better text'),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notes/7/ai',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: 'improve',
      text: 'bad text',
    });

    fireEvent.click(await screen.findByText('Replace'));
    expect(onInsert).toHaveBeenCalledWith('Better text', 4, 12);

    fireEvent.click(screen.getByText('Insert'));
    expect(onInsert).toHaveBeenLastCalledWith('Better text', 12, 12);
  });

  it('sends custom instructions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse(['Hola']));
    vi.stubGlobal('fetch', fetchMock);

    renderWithIntl(
      <AiSidebar
        noteId={1}
        getSource={() => ({ text: 'Hello', start: 0, end: 5 })}
        onInsert={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Ask anything/), {
      target: { value: 'translate to Spanish' },
    });
    fireEvent.click(screen.getByText('Run'));

    await waitFor(() =>
      expect(screen.getByTestId('ai-output').textContent).toBe('Hola'),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: 'custom',
      text: 'Hello',
      instruction: 'translate to Spanish',
    });
  });

  it('shows rate limit and empty-note errors without output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamResponse([], 429));
    vi.stubGlobal('fetch', fetchMock);
    let text = '   ';

    renderWithIntl(
      <AiSidebar
        noteId={1}
        getSource={() => ({ text, start: 0, end: text.length })}
        onInsert={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Summarize'));
    expect(await screen.findByText('Write something first.')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    text = 'Some note';
    fireEvent.click(screen.getByText('Summarize'));
    expect(await screen.findByText(/Too many AI requests/)).toBeTruthy();
    expect(screen.queryByTestId('ai-output')).toBeNull();
  });
});
