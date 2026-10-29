
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function StatusBadge({ value }) {
  const key = String(value || "unknown").toLowerCase();

  const styles = {
    submitted: "bg-blue-100 text-blue-800",
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    paid: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    escalated: "bg-purple-100 text-purple-800",
    needs_review: "bg-amber-100 text-amber-800",
    eligible: "bg-green-100 text-green-800",
    ineligible: "bg-red-100 text-red-800",
    awaiting_information: "bg-orange-100 text-orange-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
        styles[key] || "bg-slate-100 text-slate-700"
      }`}
    >
      {key.replaceAll("_", " ")}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString();
}

function formatAmount(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return "Not available";
  }

  return `$${Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatCard({ label, value, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminPage() {
  const [refunds, setRefunds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Audit history state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/refunds", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load refund requests.");
      }

      if (!Array.isArray(data)) {
        throw new Error("The refund API returned an unexpected response.");
      }

      setRefunds(data);

      setSelectedId((currentId) => {
        if (
          currentId != null &&
          data.some((item) => item.id === currentId)
        ) {
          return currentId;
        }

        return data.length ? data[0].id : null;
      });
    } catch (err) {
      setError(err.message || "Unable to load refund requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  // Load audit history whenever the selected refund changes.
  const loadAuditLogs = useCallback(async (refundId) => {
    if (refundId == null) {
      setAuditLogs([]);
      setAuditError("");
      return;
    }

    setAuditLoading(true);
    setAuditError("");

    try {
      const response = await fetch(
        `/api/admin/refunds/${refundId}/audit-logs`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not load refund audit history."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("The audit API returned an unexpected response.");
      }

      setAuditLogs(data);
    } catch (err) {
      setAuditLogs([]);
      setAuditError(
        err.message || "Unable to load refund audit history."
      );
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs(selectedId);
  }, [selectedId, loadAuditLogs]);

  const counts = useMemo(() => {
    const result = {
      total: refunds.length,
      review: 0,
      approved: 0,
      rejected: 0,
    };

    for (const refund of refunds) {
      const status = String(refund.status || "").toLowerCase();
      const eligibility = String(refund.eligibility || "").toLowerCase();

      if (
        ["submitted", "pending", "escalated", "awaiting_information"].includes(
          status
        ) ||
        ["needs_review", "escalated"].includes(eligibility)
      ) {
        result.review += 1;
      }

      if (status === "approved") result.approved += 1;
      if (status === "rejected") result.rejected += 1;
    }

    return result;
  }, [refunds]);

  const filteredRefunds = useMemo(() => {
    const term = search.trim().toLowerCase();

    return refunds.filter((refund) => {
      const matchesSearch =
        !term ||
        [
          refund.id,
          refund.order_id,
          refund.customer_email,
          refund.reason,
          refund.status,
          refund.eligibility,
        ].some((value) =>
          String(value || "").toLowerCase().includes(term)
        );

      const matchesStatus =
        statusFilter === "all" ||
        String(refund.status || "").toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [refunds, search, statusFilter]);

  const selectedRefund =
    refunds.find((refund) => refund.id === selectedId) || null;

  async function handleReview(action) {
    if (!selectedRefund) return;

    const normalizedStatus = String(
      selectedRefund.status || ""
    ).toLowerCase();

    if (["approved", "rejected", "paid"].includes(normalizedStatus)) {
      setError(
        `This request is already ${normalizedStatus} and cannot be reviewed again through this endpoint.`
      );
      return;
    }

    if (!note.trim()) {
      setError(
        "Please enter a reviewer note before recording your decision."
      );
      return;
    }

    const labels = {
      approve: "approve",
      reject: "reject",
      request_information: "request more information for",
    };

    const confirmed = window.confirm(
      `Are you sure you want to ${labels[action]} refund #${selectedRefund.id}?`
    );

    if (!confirmed) return;

    setReviewing(true);
    setError("");
    setNotice("");
    setDecision(action);

    try {
      const response = await fetch(
        `/api/admin/refunds/${selectedRefund.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision: action,
            reviewer_note: note.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not record the review decision."
        );
      }

      setRefunds((current) =>
        current.map((refund) =>
          refund.id === data.id ? data : refund
        )
      );

      setSelectedId(data.id);
      setNote(data.reviewer_note || "");
      setNotice(`Refund #${data.id} updated successfully.`);

      // Refresh audit history after the backend saves the review.
      await loadAuditLogs(data.id);
    } catch (err) {
      setError(err.message || "Review failed. Please try again.");
    } finally {
      setReviewing(false);
      setDecision("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
              Refund Support
            </p>
            <h1 className="mt-1 text-xl font-bold">
              Support dashboard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Customer form
            </Link>

            <Link
              href="/track"
              className="text-sm font-semibold text-blue-700 hover:underline"
            >
              Track refund
            </Link>

            <button
              type="button"
              onClick={loadRefunds}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-7">
          <h2 className="text-2xl font-bold">Refund operations</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review recent customer requests, understand policy outcomes,
            and record support decisions.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {notice}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Recent requests"
            value={counts.total}
            description="Requests returned by the API"
          />
          <StatCard
            label="Open / review"
            value={counts.review}
            description="Requests that may need attention"
          />
          <StatCard
            label="Approved"
            value={counts.approved}
            description="Currently marked approved"
          />
          <StatCard
            label="Rejected"
            value={counts.rejected}
            description="Currently marked rejected"
          />
        </div>

        <div className="mt-7 grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h3 className="font-bold">Recent refund requests</h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px]">
                <input
                  aria-label="Search refunds"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ID, order, email, reason..."
                  className={inputClass}
                />

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={inputClass}
                >
                  <option value="all">All statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="pending">Pending</option>
                  <option value="escalated">Escalated</option>
                  <option value="awaiting_information">
                    Awaiting information
                  </option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="p-6 text-sm text-slate-500">
                Loading requests...
              </p>
            ) : filteredRefunds.length === 0 ? (
              <p className="p-6 text-sm text-slate-500">
                No matching refund requests found.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRefunds.map((refund) => {
                  const selected = refund.id === selectedId;

                  return (
                    <button
                      type="button"
                      key={refund.id}
                      onClick={() => {
                        setSelectedId(refund.id);
                        setNote(refund.reviewer_note || "");
                        setError("");
                        setNotice("");
                      }}
                      className={`block w-full p-5 text-left transition hover:bg-slate-50 ${
                        selected
                          ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            Refund #{refund.id}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {refund.order_id || "No order ID"} ·{" "}
                            {formatDate(refund.created_at)}
                          </p>
                        </div>

                        <StatusBadge value={refund.status} />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatAmount(refund.amount)}
                        </span>
                        <StatusBadge value={refund.eligibility} />
                        <span className="text-xs capitalize text-slate-500">
                          {String(refund.reason || "unknown").replaceAll(
                            "_",
                            " "
                          )}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-xs text-slate-500">
                        {refund.customer_email || "Email not available"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            {!selectedRefund ? (
              <div>
                <h3 className="font-bold">Request details</h3>
                <p className="mt-3 text-sm text-slate-500">
                  Select a refund request to inspect its details and review
                  history.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
                      Selected request
                    </p>
                    <h3 className="mt-1 text-xl font-bold">
                      Refund #{selectedRefund.id}
                    </h3>
                  </div>
                  <StatusBadge value={selectedRefund.status} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Order ID</dt>
                    <dd className="mt-1 wrap-break-word font-semibold">
                      {selectedRefund.order_id || "Not available"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-500">Amount</dt>
                    <dd className="mt-1 font-semibold">
                      {formatAmount(selectedRefund.amount)}
                    </dd>
                  </div>

                  <div className="col-span-2">
                    <dt className="text-xs text-slate-500">
                      Customer email
                    </dt>
                    <dd className="mt-1 break-all font-semibold">
                      {selectedRefund.customer_email || "Not available"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-500">Purchase date</dt>
                    <dd className="mt-1 font-semibold">
                      {selectedRefund.purchase_date || "Not available"}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-slate-500">Reason</dt>
                    <dd className="mt-1 font-semibold capitalize">
                      {String(selectedRefund.reason || "unknown").replaceAll(
                        "_",
                        " "
                      )}
                    </dd>
                  </div>

                  <div className="col-span-2">
                    <dt className="text-xs text-slate-500">Submitted</dt>
                    <dd className="mt-1 font-medium">
                      {formatDate(selectedRefund.created_at)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <h4 className="text-sm font-bold text-blue-950">
                    Policy / reasoning notes
                  </h4>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-blue-950">
                    {selectedRefund.policy_explanation ||
                      "No policy explanation is recorded."}
                  </p>

                  {selectedRefund.details && (
                    <div className="mt-4 border-t border-blue-200 pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
                        Customer&apos;s description
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-blue-950">
                        {selectedRefund.details}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="reviewer-note"
                    className="text-sm font-semibold"
                  >
                    Reviewer note
                  </label>
                  <textarea
                    id="reviewer-note"
                    rows={4}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Record the reason for your decision or the information needed..."
                    className={`${inputClass} mt-2`}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    This note is saved with the request when you record a
                    decision.
                  </p>
                </div>

                {["approved", "rejected", "paid"].includes(
                  String(selectedRefund.status || "").toLowerCase()
                ) ? (
                  <div className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">
                    This request is already {selectedRefund.status}. The
                    current review endpoint does not allow another decision.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReview("approve")}
                      className="rounded-xl bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {reviewing && decision === "approve"
                        ? "Saving..."
                        : "Approve"}
                    </button>

                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReview("reject")}
                      className="rounded-xl bg-red-600 px-3 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {reviewing && decision === "reject"
                        ? "Saving..."
                        : "Reject"}
                    </button>

                    <button
                      type="button"
                      disabled={reviewing}
                      onClick={() => handleReview("request_information")}
                      className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {reviewing && decision === "request_information"
                        ? "Saving..."
                        : "Request info"}
                    </button>
                  </div>
                )}

                {/* Audit history */}
                <section className="mt-7 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900">
                        Refund audit history
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Recorded review actions and status changes.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={auditLoading}
                      onClick={() => loadAuditLogs(selectedRefund.id)}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                    >
                      {auditLoading ? "Loading..." : "Refresh history"}
                    </button>
                  </div>

                  {auditError && (
                    <div
                      role="alert"
                      className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                    >
                      {auditError}
                    </div>
                  )}

                  {auditLoading && auditLogs.length === 0 && (
                    <p className="mt-4 text-sm text-slate-500">
                      Loading audit history...
                    </p>
                  )}

                  {!auditLoading &&
                    !auditError &&
                    auditLogs.length === 0 && (
                      <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                        No audit records found for this refund yet.
                      </p>
                    )}

                  {auditLogs.length > 0 && (
                    <div className="mt-4 space-y-4">
                      {auditLogs.map((log) => (
                        <article
                          key={log.id}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold capitalize text-slate-900">
                                {String(log.action || "review").replaceAll(
                                  "_",
                                  " "
                                )}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                Audit record #{log.id}
                              </p>
                            </div>

                            <span className="text-xs text-slate-500">
                              {formatDate(log.created_at)}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                            <StatusBadge value={log.previous_status} />
                            <span className="text-slate-400">→</span>
                            <StatusBadge value={log.new_status} />
                          </div>

                          <p className="mt-3 text-sm text-slate-600">
                            <span className="font-medium text-slate-800">
                              Reviewer:
                            </span>{" "}
                            {log.reviewer || "Not specified"}
                          </p>

                          {log.reviewer_note && (
                            <div className="mt-3 rounded-lg bg-slate-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Reviewer note
                              </p>
                              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
                                {log.reviewer_note}
                              </p>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <p className="mt-6 text-xs leading-5 text-slate-500">
                  Demo dashboard: this page is not an authenticated admin
                  system. Restrict reviewer actions before any public
                  deployment.
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

