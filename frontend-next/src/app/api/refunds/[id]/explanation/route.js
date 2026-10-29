
import { NextResponse } from "next/server";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;

    if (!/^\d+$/.test(id)) {
      return NextResponse.json(
        { error: "Invalid refund reference." },
        { status: 400 }
      );
    }

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
        { error: "Refund service is not configured." },
        { status: 503 }
      );
    }

    const url = new URL(
      `/refunds/${encodeURIComponent(id)}/explanation`,
      backendUrl
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        detail: responseText || "Unexpected backend response.",
      };
    }

    if (!response.ok) {
      console.error(
        "Refund explanation backend returned:",
        response.status
      );

      return NextResponse.json(
        {
          error:
            data.detail || "Could not load the refund explanation.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Refund explanation proxy failed:", error);

    return NextResponse.json(
      { error: "Unable to connect to the refund service." },
      { status: 502 }
    );
  }
}
