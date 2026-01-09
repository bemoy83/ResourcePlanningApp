import { NextRequest, NextResponse } from 'next/server';
import { addAllocation } from '../../../../modules/schedule/services/scheduleService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const allocation = await addAllocation({
      eventId: body.eventId,
      workCategoryId: body.workCategoryId,
      date: body.date,
      effortValue: body.effortValue,
      effortUnit: body.effortUnit,
    });
    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add allocation' },
      { status: 400 }
    );
  }
}
