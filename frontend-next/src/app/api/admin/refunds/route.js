
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl =
      process.env.REFUND_API_URL || "http://backend:8000";

    const response = await fetch(
      `${backendUrl}/refunds?limit=100`,
      { cache: "no-store" }
    );

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text || "Unexpected backend response" };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Admin refunds proxy error:", error);

    return NextResponse.json(
      { detail: "Unable to connect to the refund service." },
      { status: 502 }
    );
  }
}

