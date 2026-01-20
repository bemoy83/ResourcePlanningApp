import { NextRequest, NextResponse } from "next/server";
import { renameWorkCategory } from "../../../../../modules/work/services/workService";
import { WorkCategoryId } from "../../../../../modules/work/domain/workCategory";
export const dynamic = "force-dynamic";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        await renameWorkCategory(params.id as WorkCategoryId, body.name);
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === "WorkCategory not found") {
            return NextResponse.json({ error: "Work category not found" }, { status: 404 });
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to rename work category" },
            { status: 400 }
        );
    }
}
