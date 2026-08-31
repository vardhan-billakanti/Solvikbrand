import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthFromCookies } from '@/lib/auth';
import { UpdateInvestigationSchema } from '@/lib/validation';
import { getBaseUrl } from '@/lib/app-url';

function getRequestBaseUrl(request: NextRequest): string {
  const envBase = getBaseUrl();
  if (envBase) return envBase;
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (host) return `${proto}://${host}`;
  return '';
}

// GET /api/investigations/[id] - Get investigation detail + visits
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // IDOR protection: always filter by ownerId
    const investigation = await prisma.investigation.findFirst({
      where: { id, ownerId: auth.sub },
      include: {
        _count: { select: { visits: true } },
        visits: {
          orderBy: { visitedAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!investigation) {
      return NextResponse.json({ success: false, error: 'Investigation not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    if (format === 'csv') {
      const headers = [
        'Visit ID',
        'Timestamp',
        'Consent Given',
        'Location Permission',
        'Battery Permission',
        'Latitude',
        'Longitude',
        'Accuracy (m)',
        'Browser',
        'Browser Version',
        'OS',
        'OS Version',
        'Screen',
        'Pixel Ratio',
        'Language',
        'Timezone',
        'Platform',
        'Device Type',
        'Battery Level (%)',
        'Charging',
      ];

      const rows = investigation.visits.map((v) => [
        v.id,
        v.visitedAt.toISOString(),
        v.consentGiven ? 'Yes' : 'No',
        v.locationPermission,
        v.batteryPermission,
        v.latitude ?? '',
        v.longitude ?? '',
        v.accuracy ?? '',
        v.browser ?? '',
        v.browserVersion ?? '',
        v.os ?? '',
        v.osVersion ?? '',
        v.screenWidth && v.screenHeight ? `${v.screenWidth}x${v.screenHeight}` : '',
        v.pixelRatio ?? '',
        v.language ?? '',
        v.timezone ?? '',
        v.platform ?? '',
        v.deviceType ?? '',
        v.batteryLevel !== null && v.batteryLevel !== undefined
          ? `${Math.round(v.batteryLevel * 100)}`
          : '',
        v.batteryCharging !== null && v.batteryCharging !== undefined
          ? v.batteryCharging
            ? 'Yes'
            : 'No'
          : '',
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const filename = `solvikbrand-${investigation.name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv`;

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const baseUrl = getRequestBaseUrl(request);
    const publicUrl = baseUrl ? `${baseUrl}/t/${investigation.publicToken}` : `/t/${investigation.publicToken}`;

    return NextResponse.json({
      success: true,
      data: {
        ...investigation,
        publicUrl,
      },
    });
  } catch (error) {
    console.error('[GET /api/investigations/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/investigations/[id] - Update investigation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = UpdateInvestigationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    // IDOR protection
    const existing = await prisma.investigation.findFirst({
      where: { id, ownerId: auth.sub },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Investigation not found' }, { status: 404 });
    }

    const updated = await prisma.investigation.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PATCH /api/investigations/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/investigations/[id] - Delete investigation and all associated visits
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookies();
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // IDOR protection
    const existing = await prisma.investigation.findFirst({
      where: { id, ownerId: auth.sub },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Investigation not found' }, { status: 404 });
    }

    // Cascade delete (visits are deleted by onDelete: Cascade in schema)
    await prisma.investigation.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Investigation deleted successfully' });
  } catch (error) {
    console.error('[DELETE /api/investigations/[id]]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
