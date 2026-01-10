import { NextRequest, NextResponse } from 'next/server';
import { setDailyCapacity } from '../../../../modules/schedule/services/scheduleService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await setDailyCapacity({
      eventId: body.eventId,
      date: body.date,
      capacityHours: body.capacityHours,
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set capacity' },
      { status: 400 }
    );
  }
}
