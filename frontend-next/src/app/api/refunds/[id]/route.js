
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const email = request.nextUrl.searchParams
      .get("email")
      ?.trim()
      .toLowerCase();

    if (!/^\d+$/.test(id) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { detail: "Enter a valid reference number and email address." },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.REFUND_API_URL || "http://backend:8000";

    const response = await fetch(
      `${backendUrl}/refunds/${encodeURIComponent(id)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json(
        { detail: "We could not find a matching refund request." },
        { status: 404 }
      );
    }

    const refund = await response.json();

    // Require the email to match before returning the request details.
    if (
      typeof refund.customer_email !== "string" ||
      refund.customer_email.trim().toLowerCase() !== email
    ) {
      return NextResponse.json(
        { detail: "We could not find a matching refund request." },
        { status: 404 }
      );
    }

    // Return only the information needed by the tracking page.
    const safeResult = {
      id: refund.id,
      order_id: refund.order_id,
      purchase_date: refund.purchase_date,
      amount: refund.amount,
      reason: refund.reason,
      eligibility: refund.eligibility,
      status: refund.status,
      policy_explanation: refund.policy_explanation,
      created_at: refund.created_at,
      updated_at: refund.updated_at,
    };

    return NextResponse.json(safeResult);
  } catch (error) {
    console.error("Refund tracking lookup failed:", error);

    return NextResponse.json(
      { detail: "The refund service is temporarily unavailable." },
      { status: 502 }
    );
  }
}
