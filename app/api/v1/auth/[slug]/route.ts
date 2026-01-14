import { getCurrentSession } from '@/app/login/lib/actions';
import { validateAdminUserExists } from '@/app/register/init/lib/actions';
import { validateAllowRegistration } from '@/app/register/lib/actions';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get('token') || '';

  if (!slug) {
    return new Response(JSON.stringify({ error: 'Slug is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof slug !== 'string') {
    return new Response(JSON.stringify({ error: 'Slug must be a string' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (slug === 'admin') {
    const adminExists = await validateAdminUserExists();
    return new Response(JSON.stringify({ exists: adminExists }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (slug === 'register') {
    const allowedRegistration = await validateAllowRegistration();
    return new Response(JSON.stringify({ allowed: allowedRegistration }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (slug === 'session') {
    const { user } = await getCurrentSession(req, token);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User session not found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ message: 'Auth API is working' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
