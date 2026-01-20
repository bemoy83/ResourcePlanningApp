import { NextRequest, NextResponse } from 'next/server';
import { evaluateSchedule } from '../../../../../../modules/schedule/services/scheduleService';
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const evaluation = await evaluateSchedule(params.eventId);
    return NextResponse.json(evaluation);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate schedule' },
      { status: 500 }
    );
  }
}
