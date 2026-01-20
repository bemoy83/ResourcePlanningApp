import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load locations' },
      { status: 500 }
    );
  }
}
