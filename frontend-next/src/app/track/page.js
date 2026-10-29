
"use client";

import { useState } from "react";
import Link from "next/link";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function Badge({ value }) {
  const key = String(value || "").toLowerCase();

  const colors = {
    submitted: "bg-blue-100 text-blue-800",
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    paid: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    needs_review: "bg-amber-100 text-amber-800",
    awaiting_information: "bg-orange-100 text-orange-800",
    escalated: "bg-purple-100 text-purple-800",
    eligible: "bg-green-100 text-green-800",
    ineligible: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
        colors[key] || "bg-slate-100 text-slate-700"
      }`}
    >
      {key ? key.replaceAll("_", " ") : "Not available"}
    </span>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-slate-900">
        {children ?? "Not available"}
      </div>
    </div>
  );
}

function getStatusSummary(status, eligibility) {
  const currentStatus = String(status || "").toLowerCase();
  const currentEligibility = String(eligibility || "").toLowerCase();

  if (currentStatus === "paid") {
    return "Your refund has been marked as paid. Check the original payment method for the funds.";
  }

  if (currentStatus === "approved") {
    return "Your refund has been approved. Approval does not necessarily mean the payment has been issued yet.";
  }

  if (currentStatus === "rejected") {
    return "Your refund request has been rejected. Review the explanation below for the recorded reason and contact support if you need clarification.";
  }

  if (currentStatus === "awaiting_information") {
    return "More information is needed before your refund can proceed. Check any messages from the support team.";
  }

  if (currentStatus === "escalated" || currentEligibility === "needs_review") {
    return "Your request requires additional review. The support team needs to assess the request before a final decision can be made.";
  }

  if (currentStatus === "pending") {
    return "Your refund request is being processed. Please check back for updates.";
  }

  if (currentEligibility === "escalated") {
    return "Your request has been escalated for additional human review. It has been submitted successfully, but a final refund decision has not yet been made.";
  }

  if (currentStatus === "submitted") {
    return "Your refund request has been submitted. It has not necessarily been approved yet.";
  }

  return "Your request has been retrieved. Review the details below for its latest recorded status.";
}

function getNextStep(status, eligibility) {
  const currentStatus = String(status || "").toLowerCase();
  const currentEligibility = String(eligibility || "").toLowerCase();

  if (currentStatus === "paid") {
    return "Check the payment method used for the original order. If the money has not arrived, contact support with your refund reference.";
  }

  if (currentStatus === "approved") {
    return "Wait for the refund payment to be processed. Check the status again later to see whether it has been marked as paid.";
  }

  if (currentStatus === "rejected") {
    return "Read the recorded explanation. If you believe the decision is incorrect, contact support and provide your refund reference and relevant evidence.";
  }

  if (currentStatus === "awaiting_information") {
    return "Provide the additional information requested by the support team so the review can continue.";
  }

  if (currentStatus === "escalated" || currentEligibility === "needs_review") {
    return "Wait for human review. Keep your order details and any supporting evidence available in case the team requests them.";
  }

  if (currentEligibility === "ineligible") {
    return "Review the policy explanation to understand why the request may not qualify. Contact support if you believe the order details are incorrect.";
  }

  if (
    currentEligibility === "escalated" ||
    currentStatus === "escalated"
  ) {
    return "Your request requires human review. Keep your refund reference safe and wait for the review decision. Contact support if you need an update.";
  }

  if (currentStatus === "pending" || currentStatus === "submitted") {
    return "Keep your refund reference safe and check this page again for updates. Contact support if the request remains unchanged for longer than the expected processing period.";
  }
}

export default function TrackRefundPage() {
  const [id, setId] = useState("");
  const [email, setEmail] = useState("");
  const [refund, setRefund] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [aiExplanation, setAiExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState("policy");

  async function loadExplanation(refundId, fallbackText) {
    setAiLoading(true);
    setAiExplanation(fallbackText || "");
    setAiSource("policy");

    try {
      const response = await fetch(
        `/api/refunds/${encodeURIComponent(refundId)}/explanation`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (response.ok) {
        const explanation =
          data.explanation ||
          data.ai_explanation ||
          data.policy_explanation ||
          data.message;

        if (typeof explanation === "string" && explanation.trim()) {
          setAiExplanation(explanation);
          setAiSource(
            data.source === "policy" || data.ai_generated === false
              ? "policy"
              : "ai"
          );
        }
      }
    } catch {
      // Tracking should still work if the explanation endpoint is unavailable.
      // Keep the policy explanation already displayed as a fallback.
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanId = id.trim();
    const cleanEmail = email.trim();

    setLoading(true);
    setError("");
    setRefund(null);
    setAiExplanation("");
    setAiSource("policy");

    try {
      const response = await fetch(
        `/api/refunds/${encodeURIComponent(cleanId)}?email=${encodeURIComponent(cleanEmail)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to retrieve this refund request. Check your reference number and email address."
        );
      }

      setRefund(data);

      // Load the explanation separately so an AI error does not
      // prevent the customer from seeing their refund status.
      await loadExplanation(
        cleanId,
        data.policy_explanation || data.explanation || ""
      );
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const date = refund?.created_at
    ? new Date(refund.created_at).toLocaleString()
    : null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">
              R
            </div>
            <div>
              <p className="font-bold">Refund Support</p>
              <p className="text-xs text-slate-500">Customer portal</p>
            </div>
          </Link>

          <Link
            href="/"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            New refund request
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            Request updates
          </span>

          <h1 className="mt-5 text-4xl font-bold tracking-tight">
            Track your refund
          </h1>

          <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-600">
            Enter the reference number you received when submitting your
            request and the email address used for that request.
          </p>
        </div>

        <div className="mt-9 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="refund-id" className="text-sm font-medium">
                Refund reference number
              </label>
              <input
                id="refund-id"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={id}
                onChange={(event) => setId(event.target.value)}
                placeholder="For example, 3"
                className={inputClass}
                required
              />
              <p className="mt-2 text-xs text-slate-500">
                Enter the number only, without the # symbol.
              </p>
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email address used for the request
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Looking up request..." : "Check refund status"}
            </button>
          </form>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              {error}
            </div>
          )}

          {refund && (
            <section
              aria-live="polite"
              className="mt-8 border-t border-slate-200 pt-7"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 text-xl text-green-700">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700">
                    Request found
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    Refund #{refund.id}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {date
                      ? `Submitted ${date}`
                      : "Request retrieved successfully"}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-5 rounded-2xl bg-slate-50 p-5 sm:grid-cols-2">
                <Detail label="Request status">
                  <Badge value={refund.status} />
                </Detail>

                <Detail label="Eligibility assessment">
                  <Badge value={refund.eligibility} />
                </Detail>

                <Detail label="Order ID">{refund.order_id}</Detail>

                <Detail label="Refund amount">
                  {refund.amount != null
                    ? `$${Number(refund.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`
                    : "Not available"}
                </Detail>

                <Detail label="Purchase date">
                  {refund.purchase_date
                    ? String(refund.purchase_date)
                    : "Not available"}
                </Detail>

                <Detail label="Reason">
                  {String(refund.reason || "Not available").replaceAll(
                    "_",
                    " "
                  )}
                </Detail>
              </div>

              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="font-semibold text-blue-950">
                  Current status explained
                </h3>
                <p className="mt-2 text-sm leading-7 text-blue-900">
                  {getStatusSummary(refund.status, refund.eligibility)}
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-indigo-950">
                    AI refund explanation
                  </h3>

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-800">
                    {aiLoading
                      ? "Generating..."
                      : aiSource === "ai"
                        ? "AI-assisted"
                        : "Policy fallback"}
                  </span>
                </div>

                {aiLoading && !aiExplanation ? (
                  <div className="mt-4 flex items-center gap-3 text-sm text-indigo-800">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
                    Preparing an explanation of your refund request...
                  </div>
                ) : (
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-indigo-950">
                    {aiExplanation ||
                      "An additional explanation is not available right now. Please refer to the current status and contact support if you need clarification."}
                  </p>
                )}

                <p className="mt-4 text-xs leading-5 text-indigo-800">
                  This explanation describes the recorded refund assessment.
                  It does not itself approve, reject, or change your refund.
                </p>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-slate-900">
                  Recommended next step
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {getNextStep(refund.status, refund.eligibility)}
                </p>
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-500">
                Request status and eligibility are different. Eligibility
                records the policy assessment; request status records the
                current workflow state. A submitted request is not necessarily
                approved, and approval does not by itself confirm that payment
                has been issued.
              </p>
            </section>
          )}
        </div>

        <p className="mt-7 text-center text-sm text-slate-500">
          Need to submit another request?{" "}
          <Link href="/" className="font-semibold text-blue-700 hover:underline">
            Visit the refund form
          </Link>
        </p>
      </section>
    </main>
  );
}
