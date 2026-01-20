import { NextRequest, NextResponse } from "next/server";
import { createEvent, listAllEvents } from "../../../modules/events/services/eventService";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const eventId = await createEvent({
            name: body.name,
            startDate: body.startDate,
            endDate: body.endDate,
        });
        return NextResponse.json({ id: eventId }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create event" },
            { status: 400 }
        );
    }
}

export async function GET() {
    try {
        const events = await listAllEvents();
        return NextResponse.json(events);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to list events" },
            { status: 500 }
        );
    }
}
