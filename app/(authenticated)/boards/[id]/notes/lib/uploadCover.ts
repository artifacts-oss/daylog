import { resizeImage } from '@/utils/image';
import { saveImage, SaveImageError } from './actions';

export type CoverError = SaveImageError | 'decode' | 'unknown';

// Stores a picked file (resized client-side) or remote URL as the note cover.
// Returns why it failed, or null on success.
export async function uploadCover(noteId: number, image: File | string): Promise<CoverError | null> {
  let source: string;
  try {
    source =
      typeof image === 'string'
        ? image
        : await new Promise<string>((resolve, reject) =>
            resizeImage(image, 1920, 1080, resolve, () => reject(new Error('decode failed'))),
          );
  } catch {
    return 'decode';
  }

  try {
    const { error } = await saveImage({ noteId, imageUrl: source });
    return error ?? null;
  } catch (e) {
    console.error(e);
    return 'unknown';
  }
}
