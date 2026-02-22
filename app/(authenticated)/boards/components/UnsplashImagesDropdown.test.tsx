import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UnsplashImagesDropdown from './UnsplashImagesDropdown';

// Mock the fetch function
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ results: [] }),
  })
) as unknown as typeof fetch;

describe('UnsplashImagesDropdown', () => {
  beforeEach(() => {
    cleanup();
    vi.useFakeTimers({ toFake: ['setTimeout'], shouldAdvanceTime: true });
  });

  it('renders the dropdown button', () => {
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    expect(screen.getByText('Search Unsplash images')).toBeInTheDocument();
  });

  it('calls imageSelected when an image is selected', async () => {
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    fireEvent.click(screen.getByText('Clear selection'));

    expect(mockImageSelected).toHaveBeenCalledWith('');
  });

  it('clears selection when Clear selection is clicked', () => {
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    const clearButton = screen.getByText('Clear selection');
    fireEvent.click(clearButton);

    expect(mockImageSelected).toHaveBeenCalledWith('');
  });

  it('fetches images based on the keyword after debounce', async () => {
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    // Simulate typing a keyword
    const input = screen.getByPlaceholderText('Type any keyword');
    fireEvent.change(input, { target: { value: 'nature' } });

    // skip 1s debounce time
    vi.advanceTimersByTime(1000);

    expect(global.fetch).toBeCalledTimes(1);
  });

  it('fetches images when the keyword inmediatelly on press enter key', async () => {
    const mockImageSelected = vi.fn();
    render(<UnsplashImagesDropdown imageSelected={mockImageSelected} />);

    // Simulate typing a keyword and pressing Enter
    const input = screen.getByPlaceholderText('Type any keyword');
    fireEvent.change(input, { target: { value: 'mountains' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // skip debounce time 
    vi.advanceTimersByTime(0);

    expect(global.fetch).toBeCalledTimes(1);
  });
});
