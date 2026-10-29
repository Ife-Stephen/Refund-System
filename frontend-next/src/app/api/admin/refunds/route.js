
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.REFUND_API_URL ||
      (process.env.NODE_ENV !== "production"
        ? "http://backend:8000"
        : "");

    if (!backendUrl) {
      console.error("Backend URL is not configured.");

      return NextResponse.json(
        { detail: "Refund service is not configured." },
        { status: 503 }
      );
    }

    const url = new URL("/refunds?limit=100", backendUrl);

    const response = await fetch(url, {
      cache: "no-store",
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text || "Unexpected backend response" };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Admin refunds proxy error:", error);

    return NextResponse.json(
      { detail: "Unable to connect to the refund service." },
      { status: 502 }
    );
  }
}
