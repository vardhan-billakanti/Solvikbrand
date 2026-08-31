import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { signJWT, setAuthCookie } from '@/lib/auth';
import { loginRateLimit, resetLoginRateLimit, clearAllRateLimits, isLocalhost } from '@/lib/rateLimit';
import { LoginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Rate limiting check
    const rateResult = loginRateLimit(ip);
    if (!rateResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many login attempts. Please try again later.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateResult.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials format' },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    // Find owner
    const owner = await prisma.owner.findUnique({ where: { username } });

    // Always run bcrypt compare to prevent timing attacks
    const dummyHash = '$2a$12$dummy.hash.for.timing.attack.prevention.only';
    const isValid = owner
      ? await bcrypt.compare(password, owner.passwordHash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!owner || !isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // On successful login, reset the rate limit counter for this IP
    resetLoginRateLimit(ip);

    // Sign JWT
    const token = await signJWT({ sub: owner.id, username: owner.username });

    // Set HTTP-only cookie
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: { username: owner.username },
    });
  } catch (error) {
    console.error('[POST /api/auth/login]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Development-only reset endpoint to clear local test lockouts
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not available in production' }, { status: 403 });
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  if (isLocalhost(ip)) {
    clearAllRateLimits();
    return NextResponse.json({ success: true, message: 'Local development rate limits cleared' });
  }

  resetLoginRateLimit(ip);
  return NextResponse.json({ success: true, message: `Rate limit for ${ip} reset` });
}
