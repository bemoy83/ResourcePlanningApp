import { NextRequest, NextResponse } from "next/server";
import { getEvent } from "../../../../modules/events/services/eventService";
export const dynamic = "force-dynamic";

export async function GET(
    request: NextRequest,
    { params }: { params: { eventId: string } }
) {
    try {
        const event = await getEvent(params.eventId);
        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }
        return NextResponse.json(event);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get event" },
            { status: 500 }
        );
    }
}
