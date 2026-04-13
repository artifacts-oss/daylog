'use server';

import { prisma } from '@/prisma/client';
import { verifyPassword } from '@/utils/crypto';
import { cookies } from 'next/headers';

export async function verifySharePassword(token: string, password: string) {
  const share = await prisma.share.findUnique({
    where: { id: token },
  });

  if (!share || !share.password) {
    throw new Error('Share not found or not password protected');
  }

  const isValid = await verifyPassword(password, share.password);

  if (isValid) {
    const c = await cookies();
    // Use a simple token in cookie to prove access. 
    // In a real app, this should be a signed JWT or similar.
    // For now, we'll store a prefix + shareId to keep it simple but separate from regular sessions.
    c.set(`share_auth_${token}`, 'authorized', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Invalid password' };
}
