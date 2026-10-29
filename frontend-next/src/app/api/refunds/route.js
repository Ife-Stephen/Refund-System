
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const backendUrl =
      process.env.REFUND_API_URL || "http://backend:8000";

    const response = await fetch(`${backendUrl}/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = { detail: responseText || "Unexpected backend response" };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Refund API proxy error:", error);

    return NextResponse.json(
      {
        detail:
          "Could not connect to the refund service. Check that the FastAPI backend is running.",
      },
      { status: 502 }
    );
  }
}

