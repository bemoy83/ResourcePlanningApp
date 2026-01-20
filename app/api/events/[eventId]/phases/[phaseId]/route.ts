import { NextRequest, NextResponse } from "next/server";
import { updateEventPhase, removeEventPhase } from "../../../../../../modules/events/services/eventPhaseService";
import { EventPhaseName } from "../../../../../../modules/events/domain/event";
export const dynamic = "force-dynamic";

export async function PATCH(
    request: NextRequest,
    { params }: { params: { eventId: string; phaseId: string } }
) {
    try {
        const body = await request.json();
        await updateEventPhase(params.phaseId, {
            name: body.name as EventPhaseName,
            startDate: body.startDate,
            endDate: body.endDate,
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === "Event phase not found") {
            return NextResponse.json({ error: "Event phase not found" }, { status: 404 });
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update event phase" },
            { status: 400 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { eventId: string; phaseId: string } }
) {
    try {
        await removeEventPhase(params.phaseId);
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        if (error instanceof Error && error.message === "Event phase not found") {
            return NextResponse.json({ error: "Event phase not found" }, { status: 404 });
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete event phase" },
            { status: 400 }
        );
    }
}
