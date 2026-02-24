/**
 * Track cancel/subscribe link click then redirect to target URL.
 * Records: user_id, link_type, service_id, target_url, ip, user_agent.
 * Table: link_clicks (backend-only, not exposed to app).
 */
import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? null;
  return request.headers.get('x-real-ip');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');
  const type = searchParams.get('type') ?? 'cancel'; // cancel | subscribe
  const service = searchParams.get('service') ?? '';

  if (!to) {
    return NextResponse.json({ error: 'Missing to parameter' }, { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(to);
  } catch {
    return NextResponse.json({ error: 'Invalid to parameter' }, { status: 400 });
  }

  // Basic URL safety: redirect only to http(s)
  if (!decoded.startsWith('http://') && !decoded.startsWith('https://')) {
    return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 });
  }

  const { userId } = await getAuth(request);
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') ?? null;

  try {
    const admin = getSupabaseAdmin();
    await admin.from('link_clicks').insert({
      clerk_user_id: userId ?? null,
      link_type: type,
      service_id: service || null,
      target_url: decoded,
      ip: ip || null,
      user_agent: userAgent,
    });
  } catch (e) {
    console.warn('[track-and-redirect] insert failed:', e);
  }

  return NextResponse.redirect(decoded, 302);
}
