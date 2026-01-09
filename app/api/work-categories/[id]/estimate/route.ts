import { NextRequest, NextResponse } from "next/server";
import { updateEstimatedEffort } from "../../../../../modules/work/services/workService";
import { WorkCategoryId } from "../../../../../modules/work/domain/workCategory";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        await updateEstimatedEffort(params.id as WorkCategoryId, body.estimatedEffortHours);
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === "WorkCategory not found") {
            return NextResponse.json({ error: "Work category not found" }, { status: 404 });
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update estimate" },
            { status: 400 }
        );
    }
}
