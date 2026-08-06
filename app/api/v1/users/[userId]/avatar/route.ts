import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { user } = await getCurrentSession();
  if (!user) return new Response(null, { status: 401 });

  const { userId } = await params;
  const record = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { profileImage: true },
  });
  if (!record?.profileImage) return new Response(null, { status: 404 });

  const match = record.profileImage.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (match) {
    return new Response(Buffer.from(match[2], 'base64'), {
      headers: { 'Content-Type': match[1], 'Cache-Control': 'private, max-age=300' },
    });
  }

  const storageRoot = path.resolve(process.env.STORAGE_PATH ?? './storage');
  const filePath = path.resolve(record.profileImage);
  if (!filePath.startsWith(`${storageRoot}${path.sep}`) || !fs.existsSync(filePath)) {
    return new Response(null, { status: 404 });
  }

  const avatar = await sharp(filePath).resize(256, 256, { fit: 'cover' }).webp().toBuffer();

  return new Response(avatar as BodyInit, {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=300' },
  });
}
