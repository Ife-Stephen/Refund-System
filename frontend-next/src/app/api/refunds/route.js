
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
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

    const url = new URL("/refunds", backendUrl);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = {
        detail: responseText || "Unexpected backend response",
      };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("Refund API proxy error:", error);

    return NextResponse.json(
      {
        detail: "Could not connect to the refund service.",
      },
      { status: 502 }
    );
  }
}
