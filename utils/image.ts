export const resizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  callback: (resizedDataUrl: string) => void,
  onError?: () => void,
) => {
  const img = new Image();
  const reader = new FileReader();

  // Undecodable files (e.g. HEIC in Chrome) never reach img.onload.
  reader.onerror = img.onerror = () => onError?.();

  // Read the image file as a data URL
  reader.onload = function (event) {
    img.src = event.target!.result!.toString();
  };

  img.onload = function () {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let width = img.width;
    let height = img.height;
    // Change the resizing logic
    if (width > height) {
      if (width > maxWidth) {
        height = height * (maxWidth / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = width * (maxHeight / height);
        height = maxHeight;
      }
    }

    // Set the canvas size to the desired dimensions
    canvas.width = width;
    canvas.height = height;

    // Draw the image on the canvas with the new dimensions
    ctx!.drawImage(img, 0, 0, width, height);

    // Convert the canvas back to an image URL and pass it to the callback
    callback(canvas.toDataURL());
  };

  reader.readAsDataURL(file);
};

export function base64ToArrayBuffer(base64: string) {
  const buffer: Buffer = Buffer.from(base64, 'base64');
  return new Uint8Array(buffer).buffer;
}

export function bytesToBase64(bytes?: Uint8Array): string | null {
  if (!bytes) return null;
  return Buffer.from(bytes).toString('base64');
}

export function getImageUrlOrFile(imageUrl: string): string {
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  } else if (imageUrl.startsWith('S3')) {
    return `/api/v1/storage?key=${imageUrl}`;
  } else {
    return `/api/v1/images?filePath=${imageUrl}`;
  }
}
