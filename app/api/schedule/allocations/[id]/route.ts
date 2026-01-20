import { NextRequest, NextResponse } from 'next/server';
import { removeAllocation, updateAllocation } from '../../../../../modules/schedule/services/scheduleService';
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const allocation = await updateAllocation({
      allocationId: params.id,
      eventId: body.eventId,
      workCategoryId: body.workCategoryId,
      date: body.date,
      effortValue: body.effortValue,
      effortUnit: body.effortUnit,
    });
    return NextResponse.json(allocation);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update allocation' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await removeAllocation(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove allocation' },
      { status: 400 }
    );
  }
}
