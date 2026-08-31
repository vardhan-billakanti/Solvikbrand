import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthFromCookies } from '@/lib/auth';
import { generatePublicToken } from '@/lib/crypto';
import { CreateInvestigationSchema } from '@/lib/validation';
import { getBaseUrl } from '@/lib/app-url';

function getRequestBaseUrl(request: NextRequest): string {
  const envBase = getBaseUrl();
  if (envBase) return envBase;
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return '';
}

// GET /api/investigations - List all investigations for the authenticated owner
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = getRequestBaseUrl(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = { ownerId: auth.sub };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const investigations = await prisma.investigation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { visits: true } },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 1,
          select: { visitedAt: true },
          ...(from || to
            ? {
                where: {
                  visitedAt: {
                    ...(from ? { gte: new Date(from) } : {}),
                    ...(to ? { lte: new Date(to) } : {}),
                  },
                },
              }
            : {}),
        },
      },
    });

    const data = investigations.map((inv) => ({
      ...inv,
      publicUrl: baseUrl ? `${baseUrl}/t/${inv.publicToken}` : `/t/${inv.publicToken}`,
      visitCount: inv._count.visits,
      latestVisit: inv.visits[0]?.visitedAt || null,
    }));

    // Dashboard stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalVisits, visitsToday] = await Promise.all([
      prisma.visit.count({ where: { investigation: { ownerId: auth.sub } } }),
      prisma.visit.count({
        where: {
          investigation: { ownerId: auth.sub },
          visitedAt: { gte: today },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        investigations: data,
        stats: {
          totalInvestigations: investigations.length,
          activeInvestigations: investigations.filter((i) => i.enabled).length,
          totalVisits,
          visitsToday,
        },
      },
    });
  } catch (error) {
    console.error('[GET /api/investigations]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/investigations - Create a new investigation
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = CreateInvestigationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const { name, description, destinationUrl } = parsed.data;
    const publicToken = generatePublicToken();

    const investigation = await prisma.investigation.create({
      data: {
        name,
        description: description || null,
        destinationUrl: destinationUrl || null,
        publicToken,
        ownerId: auth.sub,
        enabled: true,
      },
    });

    const baseUrl = getRequestBaseUrl(request);
    const publicUrl = baseUrl ? `${baseUrl}/t/${publicToken}` : `/t/${publicToken}`;

    return NextResponse.json({
      success: true,
      data: {
        ...investigation,
        publicUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/investigations]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
