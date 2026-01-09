import { NextRequest, NextResponse } from 'next/server';
import { removeAllocation } from '../../../../../modules/schedule/services/scheduleService';

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
