import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getAuthFromCookies } from '@/lib/auth';

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

    // IDOR protection
    const investigation = await prisma.investigation.findFirst({
      where: { id, ownerId: auth.sub },
      include: {
        visits: { orderBy: { visitedAt: 'desc' } },
      },
    });

    if (!investigation) {
      return NextResponse.json({ success: false, error: 'Investigation not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';

    if (format === 'json') {
      return NextResponse.json({ success: true, data: investigation });
    }

    // CSV export
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
  } catch (error) {
    console.error('[GET /api/investigations/[id]/export]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
