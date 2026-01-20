import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function POST(
    request: NextRequest,
    { params }: { params: { eventId: string } }
) {
    try {
        const body = await request.json();
        const phase = await prisma.eventPhase.create({
            data: {
            eventId: params.eventId,
                name: body.name,
                startDate: new Date(body.startDate),
                endDate: new Date(body.endDate),
            },
        });
        return NextResponse.json(phase, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to create event phase" },
            { status: 400 }
        );
    }
}
