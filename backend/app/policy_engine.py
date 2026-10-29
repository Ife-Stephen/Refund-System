
import json
from datetime import date
from pathlib import Path

CONTAINER_POLICY_PATH = Path("/app/policy/refund_policy.json")
LOCAL_POLICY_PATH = Path(__file__).resolve().parents[2] / "policy" / "refund_policy.json"
POLICY_PATH = (
    CONTAINER_POLICY_PATH
    if CONTAINER_POLICY_PATH.exists()
    else LOCAL_POLICY_PATH
)

DEFAULT_POLICY = {
    "return_window_days": 30,
    "review_threshold": 500,
    "final_sale_allowed": False,
    "reasons_eligible_for_review": [
        "damaged",
        "wrong_item",
        "not_received",
        "not_as_described",
    ],
}

# Demo escalation rules. These are review triggers, not proof of fraud.
SUSPICIOUS_TERMS = (
    "fraud",
    "chargeback",
    "already refunded",
    "duplicate refund",
    "different order",
    "conflicting information",
    "false claim",
    "suspicious",
)


def load_policy():
    try:
        with POLICY_PATH.open("r", encoding="utf-8") as file:
            loaded_policy = json.load(file)
        if not isinstance(loaded_policy, dict):
            return DEFAULT_POLICY.copy()
        return {**DEFAULT_POLICY, **loaded_policy}
    except (OSError, json.JSONDecodeError):
        return DEFAULT_POLICY.copy()


def evaluate_refund(
    purchase_date: date,
    amount: float,
    reason: str,
    final_sale: bool,
    details: str = "",
):
    policy = load_policy()
    age_days = (date.today() - purchase_date).days

    # Reject invalid/future dates before evaluating the other rules.
    if age_days < 0:
        return (
            "rejected",
            "The purchase date is in the future. Please check the date.",
        )

    # Final-sale restriction, subject to applicable law and authorized exceptions.
    if final_sale and not policy["final_sale_allowed"]:
        return (
            "rejected",
            "This item is marked final sale under the standard policy. "
            "Applicable legal rights or authorized exceptions may require review.",
        )

    # The boundary is inclusive: a request exactly 30 days old is in-window.
    window_days = int(policy["return_window_days"])
    if age_days > window_days:
        return (
            "rejected",
            f"The request is outside the {window_days}-day refund window.",
        )

    # A high-value request must be reviewed by a person.
    threshold = float(policy["review_threshold"])
    if amount > threshold:
        return (
            "escalated",
            f"Requests above ${threshold:.2f} require human review.",
        )

    # Escalate suspicious/conflicting text. This simple keyword check is only
    # a demo safeguard and is not a reliable fraud-detection system.
    normalized_details = (details or "").casefold()
    matched_terms = [
        term for term in SUSPICIOUS_TERMS if term in normalized_details
    ]
    if matched_terms:
        return (
            "escalated",
            "The request contains details requiring additional verification. "
            "A human reviewer must investigate before a decision.",
        )

    # These reasons may qualify but must never be auto-approved.
    if reason in policy["reasons_eligible_for_review"]:
        return (
            "needs_review",
            f"The reason '{reason}' may qualify under the policy, "
            "but a support agent must verify the claim before deciding.",
        )

    if reason == "changed_mind":
        return (
            "needs_review",
            "A support agent must assess this change-of-mind request "
            "against the applicable policy.",
        )

    return (
        "needs_review",
        "The request needs human review before an eligibility decision.",
    )
