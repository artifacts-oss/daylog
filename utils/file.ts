'use server';

import { getSettings } from '@/app/(authenticated)/admin/lib/actions';
import { uploadFileS3 } from '@/app/api/v1/storage/lib/s3Storage';
import { generateFileFromBase64, saveBase64File } from './storage';
import { isBase64, isUrl } from './text';

export async function saveAndGetImageFile(
  imageUrl: string
): Promise<string | null> {
  if (isUrl(imageUrl)) return imageUrl;
  
  let urlOrFilepath: string | null = null;
  if (isBase64(imageUrl)) {
    const settings = await getSettings();
    if (settings?.enableS3) {
      if (
        !process.env.S3_ENDPOINT ||
        !process.env.S3_REGION ||
        !process.env.S3_ACCESS_KEY_ID ||
        !process.env.S3_SECRET_ACCESS_KEY
      ) {
        console.error('S3 environment variables are not set');
        return null;
      }

      const { fileName, buffer, ext, contentLength } =
        generateFileFromBase64(imageUrl);
      const key = `S3-${fileName}`;
      await uploadFileS3(buffer, key, ext, contentLength);
      urlOrFilepath = key;
    } else {
      urlOrFilepath = saveBase64File(imageUrl);
    }
  }
  return urlOrFilepath;
}
