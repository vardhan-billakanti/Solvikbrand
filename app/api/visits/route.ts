import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { visitSubmitRateLimit } from '@/lib/rateLimit';
import { VisitSubmissionSchema } from '@/lib/validation';
import { hashIP } from '@/lib/crypto';

// POST /api/visits - Submit visit data (public endpoint, no auth required)
export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Rate limit per IP
    const rateResult = visitSubmitRateLimit(ip);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const parsed = VisitSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid data submitted' },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Find investigation by public token
    const investigation = await prisma.investigation.findUnique({
      where: { publicToken: data.token },
    });

    if (!investigation) {
      return NextResponse.json(
        { success: false, error: 'Invalid investigation link' },
        { status: 404 }
      );
    }

    if (!investigation.enabled) {
      return NextResponse.json(
        { success: false, error: 'This investigation link is no longer active' },
        { status: 403 }
      );
    }

    const ipHash = await hashIP(ip);

    const visit = await prisma.visit.create({
      data: {
        investigationId: investigation.id,
        consentGiven: data.consentGiven,
        locationPermission: data.locationPermission,
        batteryPermission: data.batteryPermission,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        accuracy: data.accuracy ?? null,
        locationTimestamp: data.locationTimestamp
          ? new Date(data.locationTimestamp)
          : null,
        userAgent: data.userAgent ?? null,
        browser: data.browser ?? null,
        browserVersion: data.browserVersion ?? null,
        os: data.os ?? null,
        osVersion: data.osVersion ?? null,
        screenWidth: data.screenWidth ?? null,
        screenHeight: data.screenHeight ?? null,
        pixelRatio: data.pixelRatio ?? null,
        language: data.language ?? null,
        timezone: data.timezone ?? null,
        platform: data.platform ?? null,
        deviceType: data.deviceType ?? null,
        batteryLevel: data.batteryLevel ?? null,
        batteryCharging: data.batteryCharging ?? null,
        ipHash,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          visitId: visit.id,
          destinationUrl: investigation.destinationUrl || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/visits]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/visits?token=xxx - Check if investigation is active (for visitor page)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || token.length > 100) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }

    const investigation = await prisma.investigation.findUnique({
      where: { publicToken: token },
      select: { id: true, name: true, enabled: true, destinationUrl: true },
    });

    if (!investigation) {
      return NextResponse.json({ success: false, error: 'not_found' }, { status: 404 });
    }

    if (!investigation.enabled) {
      return NextResponse.json({ success: false, error: 'disabled' }, { status: 403 });
    }

    // Never expose internal id or owner info
    return NextResponse.json({
      success: true,
      data: {
        active: true,
        destinationUrl: investigation.destinationUrl || null,
      },
    });
  } catch (error) {
    console.error('[GET /api/visits]', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
