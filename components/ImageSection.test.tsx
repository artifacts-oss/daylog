import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ImageSection from './ImageSection';
import { renderWithIntl } from '@/utils/test/renderWithIntl';

// Mock getImageUrlOrFile
vi.mock('@/utils/image', () => ({
  getImageUrlOrFile: (url: string) => url,
}));

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'https://mock-local-url');

describe('ImageSection', () => {
  const mockOnImageFileChange = vi.fn();
  const mockOnImageUrlChange = vi.fn();
  const mockOnDeleteImage = vi.fn();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders default state without image', () => {
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
      />,
    );

    expect(screen.getByText('Upload from Device')).toBeInTheDocument();
    expect(screen.queryByText('Search Unsplash')).not.toBeInTheDocument();
  });

  it('renders default state with Unsplash allowed', () => {
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
        isUnsplashAllowed={true}
      />,
    );

    expect(screen.getByText('Upload from Device')).toBeInTheDocument();
    expect(screen.getByText('Search Unsplash')).toBeInTheDocument();
  });

  it('renders image when currentImageUrl is provided', () => {
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        currentImageUrl="https://test-image.jpg"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
        onDeleteImage={mockOnDeleteImage}
      />,
    );

    expect(screen.queryByText('Upload from Device')).not.toBeInTheDocument();
    expect(screen.getByText('Change Image')).toBeInTheDocument();
    expect(screen.getByText('Remove Current')).toBeInTheDocument();
    expect(screen.getByAltText('Test Image')).toBeInTheDocument();
  });

  it('handles image file selection', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
      />,
    );

    const fileList = [
      new File(['dummy content'], 'test.png', { type: 'image/png' }),
    ];
    const uploadInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(uploadInput, fileList);

    expect(mockOnImageFileChange).toHaveBeenCalledWith(fileList[0]);
    expect(mockOnImageUrlChange).toHaveBeenCalledWith('');
    expect(screen.getByText('test.png')).toBeInTheDocument();
    expect(screen.getByAltText('Test Image')).toBeInTheDocument();
  });

  it('handles file removal after selection', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
      />,
    );

    const fileList = [
      new File(['dummy content'], 'test.png', { type: 'image/png' }),
    ];
    const uploadInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    await user.upload(uploadInput, fileList);

    // The trash icon for removing the selected file is in the component
    const removeButtons = screen.getAllByRole('button');
    // Using custom role or closest identifier to find the remove unsubmitted file button
    // It's the button inside the div with selectedFileName
    const removeSelectedFileBtn = removeButtons[removeButtons.length - 1];

    await user.click(removeSelectedFileBtn);

    expect(mockOnImageFileChange).toHaveBeenCalledWith(undefined);
    expect(screen.queryByText('test.png')).not.toBeInTheDocument();
  });

  it('handles image removal for existing image', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        currentImageUrl="https://test-image.jpg"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
        onDeleteImage={mockOnDeleteImage}
      />,
    );

    const removeBtn = screen.getByText('Remove Current');
    await user.click(removeBtn);

    expect(mockOnDeleteImage).toHaveBeenCalled();
  });

  it('opens and closes Unsplash search mode', async () => {
    const user = userEvent.setup();
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
        isUnsplashAllowed={true}
      />,
    );

    const searchBtn = screen.getByText('Search Unsplash');
    await user.click(searchBtn);

    expect(
      screen.getByPlaceholderText(
        'Search high-quality images from Unsplash...',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Cancel Search')).toBeInTheDocument();

    const cancelBtn = screen.getByText('Cancel Search');
    await user.click(cancelBtn);

    expect(
      screen.queryByPlaceholderText(
        'Search high-quality images from Unsplash...',
      ),
    ).not.toBeInTheDocument();
  });

  it('fetches and displays Unsplash images', async () => {
    const mockUnsplashResponse = {
      results: [
        {
          id: '1',
          description: 'A beautiful sunset',
          urls: { thumb: 'https://thumb-url', regular: 'https://regular-url' },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockUnsplashResponse),
    });

    const user = userEvent.setup();
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
        isUnsplashAllowed={true}
      />,
    );

    await user.click(screen.getByText('Search Unsplash'));

    const input = screen.getByPlaceholderText(
      'Search high-quality images from Unsplash...',
    );
    // Type and press Enter (we trigger fetch directly by default in the component)
    await user.type(input, 'sunset{enter}');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('keyword=sunset'),
      );
      expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
    });
  });

  it('handles Unsplash image selection', async () => {
    const mockUnsplashResponse = {
      results: [
        {
          id: '1',
          description: 'A beautiful sunset',
          urls: { thumb: 'https://thumb-url', regular: 'https://regular-url' },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockUnsplashResponse),
    });

    const user = userEvent.setup();
    renderWithIntl(
      <ImageSection
        altText="Test Image"
        onImageFileChange={mockOnImageFileChange}
        onImageUrlChange={mockOnImageUrlChange}
        isUnsplashAllowed={true}
      />,
    );

    await user.click(screen.getByText('Search Unsplash'));
    const input = screen.getByPlaceholderText(
      'Search high-quality images from Unsplash...',
    );
    await user.type(input, 'sunset{enter}');

    await waitFor(() => {
      expect(screen.getByAltText('A beautiful sunset')).toBeInTheDocument();
    });

    const imageBtn = screen
      .getByAltText('A beautiful sunset')
      .closest('button');
    if (imageBtn) {
      await user.click(imageBtn);
    }

    expect(mockOnImageUrlChange).toHaveBeenCalledWith('https://regular-url');
    // Ensure it correctly updates the UI
    expect(mockOnImageFileChange).toHaveBeenCalledWith(undefined);
  });
});
