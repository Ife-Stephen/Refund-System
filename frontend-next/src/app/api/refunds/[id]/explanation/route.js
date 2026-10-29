export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const backendUrl =
      process.env.REFUND_API_URL || "http://backend:8000";

    const response = await fetch(
      `${backendUrl}/refunds/${encodeURIComponent(id)}/explanation`,
      { cache: "no-store" }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return Response.json(
        { error: data.detail || "Could not load the refund explanation." },
        { status: response.status }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error("Refund explanation proxy failed:", error);

    return Response.json(
      { error: "Unable to connect to the refund service." },
      { status: 502 }
    );
  }
}
