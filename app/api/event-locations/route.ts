import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const eventLocations = await prisma.eventLocation.findMany();
    return NextResponse.json(eventLocations);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load event locations' },
      { status: 500 }
    );
  }
}
