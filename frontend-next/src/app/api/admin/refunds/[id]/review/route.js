
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { detail: "Invalid refund reference." },
        { status: 400 }
      );
    }

    const body = await request.json();

    const backendUrl =
      process.env.BACKEND_URL ||
      process.env.REFUND_API_URL ||
      (process.env.NODE_ENV === "production"
        ? ""
        : "http://backend:8000");

    if (!backendUrl) {
      console.error(
        "Backend URL is not configured. Check the Vercel service binding."
      );

      return NextResponse.json(
        { detail: "Refund service is not configured." },
        { status: 503 }
      );
    }

    const url = new URL(
      `/refunds/${id}/review`,
      backendUrl
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        detail: text || "Unexpected backend response",
      };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Admin review proxy error:", error);

    return NextResponse.json(
      { detail: "Unable to connect to the refund service." },
      { status: 502 }
    );
  }
}
