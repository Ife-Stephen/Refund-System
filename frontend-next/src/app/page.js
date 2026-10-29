"use client";
import { useState } from "react";
const initialForm = {
  order_id: "",
  customer_email: "",
  purchase_date: "",
  amount: "",
  reason: "",
  item_is_final_sale: false,
  details: "",
};
const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
function StatusBadge({ value, type = "status" }) {
  const styles = {
    submitted: "bg-blue-50 text-blue-700 ring-blue-600/20",
    approved: "bg-green-50 text-green-700 ring-green-600/20",
    paid: "bg-green-50 text-green-700 ring-green-600/20",
    rejected: "bg-red-50 text-red-700 ring-red-600/20",
    escalated: "bg-violet-50 text-violet-800 ring-violet-600/20",
    needs_review: "bg-amber-50 text-amber-800 ring-amber-600/20",
    awaiting_information: "bg-amber-50 text-amber-800 ring-amber-600/20",
    pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
    default: "bg-slate-100 text-slate-700 ring-slate-500/20",
  };
  const key = String(value || "").toLowerCase();
  const style = styles[key] || styles.default;
  const label = key
    ? key.replaceAll("_", " ")
    : "Not available";
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold capitalize ring-1 ring-inset ${style}`}
      aria-label={`${type}: ${label}`}
    >
      {label}
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
        {children || "Not provided"}
      </div>
    </div>
  );
}
export default function Home() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [aiExplanation, setAiExplanation] = useState("");
  const [explanationLoading, setExplanationLoading] = useState(false);
  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setCopied(false);
    try {
      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          amount: Number(form.amount),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail ?? data);
        throw new Error(message || "The request could not be submitted.");
      }
      setResult({
        success: true,
        data,
      });
      if (data.id != null) {
        setExplanationLoading(true);
        try {
          const response = await fetch(
            `/api/refunds/${encodeURIComponent(data.id)}/explanation`,
            { cache: "no-store" }
          );
          const explanationData = await response.json();
          setAiExplanation(
            response.ok && explanationData.explanation
            ? explanationData.explanation
            : data.policy_explanation || ""
          );
        } catch (error) {
          console.error("Explanation request failed:", error);
          setAiExplanation(data.policy_explanation || "");
        } finally {
          setExplanationLoading(false);
        }
      }
      // If submission fails, the form stays populated so the customer can correct entries.
    } catch (error) {
      setResult({
        success: false,
        message: error.message || "Unable to submit your request.",
      });
    } finally {
      setLoading(false);
    }
  }
  async function copyReference() {
    if (!result?.data?.id) return;
    try {
      await navigator.clipboard.writeText(String(result.data.id));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  function startAnotherRequest() {
    setForm(initialForm);
    setResult(null);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const data = result?.data;
  const isSuccess = result?.success === true;
  const statusMessage = {
    submitted:
      "Your request has been received and recorded. Keep your reference number for future enquiries. The assessment below explains the next step.",
    pending:
      "Your request is pending. Please check back for an update.",
    approved:
      "Your request has been marked as approved. Check any instructions provided by the support team.",
    rejected:
      "A decision has been recorded for your request. Review the assessment below for the explanation.",
    awaiting_information:
      "The support team needs more information before it can continue reviewing your request. Follow any instructions provided by support.",
    paid:
      "Your request is marked as paid. Check your payment method and any instructions from the support team.",
  };
  const eligibilityMessage = {
    needs_review:
      "A support agent must review your request before a final decision can be made.",
    escalated:
      "Your request has been escalated for additional human review. Escalation is not approval, and no refund payment has been confirmed.",
    eligible:
      "The policy evaluation indicates that your request meets the eligibility criteria. This does not necessarily mean it has been approved or paid.",
    rejected:
      "The request was rejected under the standard policy. Review the explanation below; applicable legal rights or authorized exceptions may affect the outcome.",
    ineligible:
      "The policy evaluation indicates that your request does not meet the standard eligibility criteria.",
  };
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white">
              R
            </div>
            <div>
              <p className="font-bold tracking-tight">Refund Support</p>
              <p className="text-xs text-slate-500">Customer portal</p>
            </div>
          </a>
          <div className="flex items-center gap-4">
            <a href="/track"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              Track refund
            </a>
            <span className="hidden text-sm text-slate-500 sm:block">
              Here to help with your order
            </span>
</div>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <div className="pt-3">
          <span className="inline-flex rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            Customer care, made simpler
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-5xl sm:leading-tight">
            Let&apos;s get your
            <span className="block text-blue-600">refund sorted.</span>
          </h1>
          <p className="mt-5 max-w-lg leading-7 text-slate-600">
            Tell us about your order and what went wrong.
            Our refund support system will process your request
            and explain the next steps.
          </p>
          <div className="mt-9 space-y-5">
            {[
              [
                "01",
                "Share your order details",
                "Enter your order information and explain the issue.",
              ],
              [
                "02",
                "Submit your request",
                "Your information is sent to our refund service.",
              ],
              [
                "03",
                "Review your result",
                "Receive a reference number and see the current status.",
              ],
            ].map(([number, title, description]) => (
              <div key={number} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                  {number}
                </div>
                <div>
                  <h2 className="font-semibold">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-9 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
            <p className="font-semibold text-slate-800">
              Keep your reference number
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              You may need it when contacting support about your request.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-semibold text-slate-800">
              Refund policy at a glance
            </p>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
              <li>
                <span className="font-semibold text-slate-800">30-day window: </span>
                Requests submitted more than 30 calendar days after purchase are outside the standard refund window, subject to applicable legal requirements or authorized exceptions.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Final-sale items: </span>
                Generally not eligible under the standard policy, subject to applicable law and authorized exceptions.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Over $500: </span>
                Requests above $500 require human review before a decision.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Item problems: </span>
                Damaged, incorrect, missing, or misdescribed items may qualify, but are not automatically approved.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Extra checks: </span>
                Suspicious or conflicting information may be escalated for additional review.
              </li>
            </ul>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Submitting a request is not the same as receiving approval or payment.
            </p>
          </div>
        </div>
        <div className="self-start rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50 sm:p-8">
          {!isSuccess && (
            <>
              <div className="mb-7">
                <p className="text-sm font-semibold text-blue-600">
                  REFUND REQUEST
                </p>
                <h2 className="mt-2 text-2xl font-bold">
                  Tell us about your order
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Complete the required fields below. Your request will be assessed against the refund policy; submitting it does not guarantee approval.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="order_id" className="text-sm font-medium">
                      Order ID
                    </label>
                    <input
                      id="order_id"
                      name="order_id"
                      value={form.order_id}
                      onChange={handleChange}
                      placeholder="ORD-1001"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="customer_email"
                      className="text-sm font-medium"
                    >
                      Email address
                    </label>
                    <input
                      id="customer_email"
                      name="customer_email"
                      type="email"
                      value={form.customer_email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="purchase_date"
                      className="text-sm font-medium"
                    >
                      Purchase date
                    </label>
                    <input
                      id="purchase_date"
                      name="purchase_date"
                      type="date"
                      value={form.purchase_date}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="amount" className="text-sm font-medium">
                      Refund amount (USD)
                    </label>
                    <input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={handleChange}
                      placeholder="49.99"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="reason" className="text-sm font-medium">
                    Reason for refund
                  </label>
                  <select
                    id="reason"
                    name="reason"
                    value={form.reason}
                    onChange={handleChange}
                    className={inputClass}
                    required
                  >
                    <option value="">Choose a reason</option>
                    <option value="changed_mind">Changed my mind</option>
                    <option value="damaged">Item arrived damaged</option>
                    <option value="wrong_item">Incorrect item received</option>
                    <option value="not_received">Item not received</option>
                    <option value="not_as_described">Item not as described</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="details" className="text-sm font-medium">
                    Tell us what happened
                  </label>
                  <textarea
                    id="details"
                    name="details"
                    rows={4}
                    value={form.details}
                    onChange={handleChange}
                    placeholder="Describe the issue with your order..."
                    className={inputClass}
                    required
                  />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="item_is_final_sale"
                    checked={form.item_is_final_sale}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                  />
                  <span>
                    <span className="block font-medium">This item was marked as final sale.</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Select this only if the product listing or order information identifies the item as final sale. This may be verified against order records.
                    </span>
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Submitting request..." : "Submit refund request"}
                </button>
                <p className="text-center text-xs leading-5 text-slate-500">
                  Requests outside the standard policy may be rejected. Some requests require human review, and submitting a request does not guarantee approval or payment.
                </p>
              </form>
            </>
          )}
          {result && !isSuccess && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5"
            >
              <h3 className="font-semibold text-red-800">
                We couldn&apos;t submit your request
              </h3>
              <p className="mt-2 break-words text-sm leading-6 text-red-700">
                {result.message}
              </p>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          )}
          {isSuccess && data && (
            <div aria-live="polite">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-8 w-8"
                  aria-hidden="true"
                >
                  <path
                    d="m5 12 4 4L19 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-green-700">
                Request received
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Thank you!
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                {statusMessage[String(data.status || "").toLowerCase()] ||
                  "Your request has been recorded. Review its status and details below."}
              </p>
              <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Your refund reference
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-3xl font-bold text-slate-900">
                    {data.id != null ? `#${data.id}` : "Unavailable"}
                  </span>
                  {data.id != null && (
                    <button
                      type="button"
                      onClick={copyReference}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                    >
                      {copied ? "Copied!" : "Copy reference"}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Save this reference for your records.
                </p>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Detail label="Request status">
                  <StatusBadge value={data.status} />
                </Detail>
                <Detail label="Eligibility">
                  <StatusBadge value={data.eligibility} type="eligibility" />
                </Detail>
                <Detail label="Order ID">{data.order_id}</Detail>
                <Detail label="Amount">
                  {data.amount != null ? String(data.amount) : "Not provided"}
                </Detail>
                <Detail label="Purchase date">{data.purchase_date}</Detail>
                <Detail label="Reason">{data.reason}</Detail>
              </div>
              <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-amber-700" aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-6 w-6"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path
                        d="M12 11v5m0-8h.01"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Refund assessment
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-amber-900">
                      {data.policy_explanation ||
                        eligibilityMessage[
                          String(data.eligibility || "").toLowerCase()
                        ] ||
                        "Please contact customer support if you need more information about this assessment."}
                    </p>
                  </div>
                  <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                    <h3 className="font-semibold text-blue-950">
                      Customer-friendly explanation
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-blue-950">
                      {explanationLoading
                      ? "Preparing an explanation..."
                      : aiExplanation ||
                      data.policy_explanation ||
                      "Your request has been recorded. Please check back for updates."}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-blue-800">
                      This explanation does not change your refund status or policy assessment.
                    </p>
                  </div>
                </div>
              </div>
              {data.reviewer_note && (
                <div className="mt-5 rounded-xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold">Support note</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {data.reviewer_note}
                  </p>
                </div>
              )}
              <details className="mt-6 rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  View technical response
                </summary>
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
              <button
                type="button"
                onClick={startAnotherRequest}
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-700"
              >
                Submit another request
              </button>
            </div>
          )}
        </div>
      </section>
      <footer className="border-t border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-500">
        AI Refund Support · Customer Service
      </footer>
    </main>
  );
}
