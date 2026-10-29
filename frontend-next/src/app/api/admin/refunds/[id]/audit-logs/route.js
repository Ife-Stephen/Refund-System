
import { NextResponse } from "next/server";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { detail: "Invalid refund reference." },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.REFUND_API_URL || "http://backend:8000";

    const response = await fetch(
      `${backendUrl}/refunds/${id}/audit-logs`,
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
    console.error("Audit log proxy error:", error);

    return NextResponse.json(
      { detail: "Unable to retrieve audit history." },
      { status: 502 }
    );
  }
}
