import { NextRequest, NextResponse } from "next/server";
import { createWorkCategory } from "../../../modules/work/services/workService";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const workCategoryId = await createWorkCategory({
            eventId: body.eventId,
            name: body.name,
            estimatedEffortHours: body.estimatedEffortHours,
        });
        return NextResponse.json({ id: workCategoryId }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create work category" },
            { status: 400 }
        );
    }
}
