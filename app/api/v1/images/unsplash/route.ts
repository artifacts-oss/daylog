import { getCurrentSession } from '@/app/login/lib/actions';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { user } = await getCurrentSession(req);

  if (!user) {
    return Response.json({ error: 'Not allowed' });
  }

  if (!process.env.UNSPLASH_ACCESS_KEY) {
    return new Response('UNSPLASH_ACCESS_KEY is not set', { status: 500 });
  }

  const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

  const keyword = req.nextUrl.searchParams.get('keyword') || 'nature';
  const page = parseInt(req.nextUrl.searchParams.get('page') || '1', 10);
  const p_page = parseInt(req.nextUrl.searchParams.get('perpage') || '9', 10);
  const url = `https://api.unsplash.com/search/photos?query=${keyword}&page=${page}&per_page=${p_page}&orientation=landscape`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
  });

  if (!response.ok) {
    return new Response('Failed to fetch images', { status: response.status });
  }

  const data = await response.json();
  return Response.json(data);
}
