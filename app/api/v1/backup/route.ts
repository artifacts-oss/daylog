import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { decryptBoardFields, decryptNoteFields, getSessionEncryptionKey } from '@/utils/encryption';
import { isUrl } from '@/utils/text';
import { assertSafeRemoteUrl } from '@/utils/ssrf';
import * as S3 from '@aws-sdk/client-s3';
import { s3Client } from '../storage/lib/s3Client';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

function getImageExt(imageUrl: string): string {
  try {
    if (isUrl(imageUrl)) {
      const ext = path.extname(new URL(imageUrl).pathname);
      return ext || '.jpg';
    }
    const ext = path.extname(imageUrl);
    return ext || '.jpg';
  } catch {
    return '.jpg';
  }
}

async function addImageToZip(
  zip: JSZip,
  imageUrl: string,
  zipPath: string,
): Promise<string> {
  try {
    if (isUrl(imageUrl)) {
      // Prevent SSRF: never fetch URLs that resolve to internal addresses.
      await assertSafeRemoteUrl(imageUrl);
      const res = await fetch(imageUrl);
      if (!res.ok) return imageUrl;
      const buffer = Buffer.from(await res.arrayBuffer());
      zip.file(zipPath, buffer);
      return zipPath;
    } else if (imageUrl.startsWith('S3-') && s3Client) {
      const command = new S3.GetObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: imageUrl,
      });
      const response = await s3Client.send(command);
      const body = await response.Body?.transformToByteArray();
      if (!body) return imageUrl;
      zip.file(zipPath, Buffer.from(body));
      return zipPath;
    } else {
      const buffer = fs.readFileSync(imageUrl);
      zip.file(zipPath, buffer);
      return zipPath;
    }
  } catch {
    return imageUrl;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { user, session } = await getCurrentSession(req);

    if (!user || !session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        encryptionEnabled: true,
        boards: {
          include: {
            notes: {
              include: {
                pictures: true,
              },
            },
          },
        },
      },
    });

    if (!userData) {
      return new Response('User not found', { status: 404 });
    }

    const encKey = userData.encryptionEnabled
      ? await getSessionEncryptionKey(session.id)
      : null;

    const zip = new JSZip();

    const exportBoards = await Promise.all(
      userData.boards.map(async (board) => {
        const decBoard = encKey ? decryptBoardFields(board, encKey) : board;

        let boardImageUrl = decBoard.imageUrl;
        if (decBoard.imageUrl) {
          const ext = getImageExt(decBoard.imageUrl);
          boardImageUrl = await addImageToZip(
            zip,
            decBoard.imageUrl,
            `images/boards/${board.id}/cover${ext}`,
          );
        }

        const exportNotes = await Promise.all(
          board.notes.map(async (note) => {
            const decNote = encKey ? decryptNoteFields(note, encKey) : note;

            let noteImageUrl = decNote.imageUrl;
            if (decNote.imageUrl) {
              const ext = getImageExt(decNote.imageUrl);
              noteImageUrl = await addImageToZip(
                zip,
                decNote.imageUrl,
                `images/notes/${note.id}/cover${ext}`,
              );
            }

            const exportPictures = await Promise.all(
              note.pictures.map(async (pic) => {
                const ext = getImageExt(pic.imageUrl);
                const picPath = await addImageToZip(
                  zip,
                  pic.imageUrl,
                  `images/notes/${note.id}/picture-${pic.id}${ext}`,
                );
                return { ...pic, imageUrl: picPath };
              }),
            );

            return { ...decNote, imageUrl: noteImageUrl, pictures: exportPictures };
          }),
        );

        return { ...decBoard, imageUrl: boardImageUrl, notes: exportNotes };
      }),
    );

    const exportData = {
      name: userData.name,
      email: userData.email,
      boards: exportBoards,
    };

    zip.file('data.json', JSON.stringify(exportData, null, 2));

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="daylog-export-${date}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error generating backup:', error);
    return new Response('Failed to generate backup', { status: 500 });
  }
}
