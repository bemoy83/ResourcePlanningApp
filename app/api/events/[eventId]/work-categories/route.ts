import { NextRequest, NextResponse } from "next/server";
import { listWorkCategoriesForEvent } from "../../../../../modules/work/services/workService";
export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: { eventId: string } }
) {
    try {
        const workCategories = await listWorkCategoriesForEvent(params.eventId);
        return NextResponse.json(workCategories);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to list work categories" },
            { status: 500 }
        );
    }
}
