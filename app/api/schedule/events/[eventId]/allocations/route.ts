import { NextRequest, NextResponse } from 'next/server';
import { loadAllocationsByEvent } from '../../../../../../modules/schedule/persistence/allocationRepository';
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const allocations = await loadAllocationsByEvent(params.eventId);
    return NextResponse.json(allocations);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load allocations' },
      { status: 500 }
    );
  }
}
