import { prisma } from '@/prisma/client';
import fs from 'fs';
import { NextRequest } from 'next/server';
import sharp from 'sharp';
import path from 'path';
import { cookies } from 'next/headers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; path: string[] }> },
) {
  const { token, path: pathSegmentsArr } = await params;
  const cookieStore = await cookies();

  // Validate if the share token exists
  const share = await prisma.share.findUnique({
    where: { id: token },
  });

  if (!share) {
    return Response.json({ error: 'Invalid share token' }, { status: 401 });
  }

  // Check expiration
  if (share.expiresAt && new Date() > share.expiresAt) {
    return Response.json({ error: 'Share link expired' }, { status: 403 });
  }

  // Check password protection
  if (share.password) {
    const isAuthorized =
      cookieStore.get(`share_auth_${token}`)?.value === 'authorized';
    if (!isAuthorized) {
      return Response.json({ error: 'Password required' }, { status: 403 });
    }
  }

  const pathSegments = pathSegmentsArr.join('/');
  const pathsToTry = [pathSegments, '/' + pathSegments];

  // Validate if image belongs to shared entity
  let actualFilePath: string | null = null;

  if (share.entityType === 'NOTE') {
    const note = await prisma.note.findFirst({
      where: {
        id: share.entityId,
        OR: [
          { imageUrl: { in: pathsToTry } },
          { pictures: { some: { imageUrl: { in: pathsToTry } } } },
        ],
      },
      include: { pictures: { where: { imageUrl: { in: pathsToTry } } } },
    });

    if (note) {
      if (note.imageUrl && pathsToTry.includes(note.imageUrl)) {
        actualFilePath = note.imageUrl;
      } else if (note.pictures.length > 0) {
        actualFilePath = note.pictures[0].imageUrl;
      }
    }
  } else {
    const board = await prisma.board.findFirst({
      where: {
        id: share.entityId,
        OR: [
          { imageUrl: { in: pathsToTry } },
          {
            notes: {
              some: {
                OR: [
                  { imageUrl: { in: pathsToTry } },
                  { pictures: { some: { imageUrl: { in: pathsToTry } } } },
                ],
              },
            },
          },
        ],
      },
      include: {
        notes: {
          where: {
            OR: [
              { imageUrl: { in: pathsToTry } },
              { pictures: { some: { imageUrl: { in: pathsToTry } } } },
            ],
          },
          include: { pictures: { where: { imageUrl: { in: pathsToTry } } } },
        },
      },
    });

    if (board) {
      if (board.imageUrl && pathsToTry.includes(board.imageUrl)) {
        actualFilePath = board.imageUrl;
      } else if (board.notes.length > 0) {
        const note = board.notes[0];
        if (note.imageUrl && pathsToTry.includes(note.imageUrl)) {
          actualFilePath = note.imageUrl;
        } else if (note.pictures.length > 0) {
          actualFilePath = note.pictures[0].imageUrl;
        }
      }
    }
  }

  if (!actualFilePath) {
    return Response.json(
      { error: 'Image not found in this share' },
      { status: 404 },
    );
  }

  // SECURITY: Validate path traversal by ensuring the file is within the storage directory
  const rootStorage = path.resolve(process.env.STORAGE_PATH ?? './storage');
  const resolvedPath = path.resolve(actualFilePath);

  if (!resolvedPath.startsWith(rootStorage)) {
    console.error(
      `Security alert: Attempted path traversal for file: ${actualFilePath}`,
    );
    return Response.json({ error: 'Security violation' }, { status: 403 });
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return new Response('File not found', { status: 404 });
    }

    const imageBuffer = fs.readFileSync(resolvedPath);
    const optimizedImage = await sharp(imageBuffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp()
      .toBuffer();

    return new Response(optimizedImage as BodyInit, {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': optimizedImage.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Image processing error:', error);
    return new Response('Error processing image', { status: 500 });
  }
}
