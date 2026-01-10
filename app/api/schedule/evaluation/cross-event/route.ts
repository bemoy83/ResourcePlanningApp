import { NextResponse } from 'next/server';
import { evaluateCrossEventSchedule } from '../../../../../modules/schedule/services/scheduleService';

export async function GET() {
  try {
    const evaluation = await evaluateCrossEventSchedule();
    return NextResponse.json(evaluation);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to evaluate cross-event schedule' },
      { status: 500 }
    );
  }
}
