import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { negotiateMeal } from "@/lib/negotiate/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const result = await negotiateMeal(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid meal text. Tell LaterMe what you are thinking about eating.",
          details: error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Negotiation failed unexpectedly." },
      { status: 500 },
    );
  }
}
