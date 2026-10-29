
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { detail: "Invalid refund reference." },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.REFUND_API_URL || "http://backend:8000";

    const response = await fetch(
      `${backendUrl}/refunds/${id}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }
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
    console.error("Admin review proxy error:", error);

    return NextResponse.json(
      { detail: "Unable to connect to the refund service." },
      { status: 502 }
    );
  }
}
