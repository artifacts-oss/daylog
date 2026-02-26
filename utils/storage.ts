import { deleteFileS3 } from '@/app/api/v1/storage/lib/s3Storage';
import fs from 'fs';
import path from 'path';

export function saveBase64File(base64String: string) {
  const folderPath = process.env.STORAGE_PATH ?? './storage';

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Extract the MIME type and Base64 data
  const { fileName, buffer } = generateFileFromBase64(base64String);
  const filePath = path.join(folderPath, fileName);
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

export function generateFileFromBase64(base64String: string): {
  fileName: string;
  buffer: Buffer<ArrayBuffer>;
  ext: string;
  contentLength: number;
} {
  const base64Index = base64String.indexOf(';base64,');
  if (base64Index === -1 || !base64String.startsWith('data:')) {
    throw new Error('Invalid Base64 format');
  }

  const mimeType = base64String.slice(5, base64Index);
  const data = base64String.slice(base64Index + 8);

  const ext = mimeType.split('/')[1]; // Extract file extension
  const buffer = Buffer.from(data, 'base64'); // Convert to buffer
  const fileName = generateRandomFilename(ext);
  const contentLength = buffer.length;
  return { fileName, buffer, ext, contentLength };
}

export function removeFile(filePath?: string | null) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else if (filePath?.startsWith('S3')) {
      deleteFileS3(filePath);
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

// Generate a random filename with an extension
function generateRandomFilename(extension: string) {
  return `${crypto.randomUUID()}.${extension}`;
}
