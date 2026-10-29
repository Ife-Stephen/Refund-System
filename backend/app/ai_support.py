import os
from openai import OpenAI


def explain_refund(
    eligibility: str,
    policy_explanation: str,
    reason: str,
    details: str,
) -> str:
    """Generate a customer-friendly, policy-grounded refund explanation."""

    fallback = (
        f"Your request status is '{eligibility}'. "
        f"{policy_explanation}"
    )

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    model_id = os.getenv("GROQ_MODEL_ID", "openai/gpt-oss-20b")

    if not api_key:
        print("Groq API key is not configured; using policy fallback.")
        return fallback

    try:
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
            timeout=30.0,
            max_retries=0,
        )

        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a customer-support assistant for an "
                        "e-commerce refund system. Write a complete, "
                        "customer-friendly explanation in 2-3 concise "
                        "sentences. The eligibility and policy explanation "
                        "are authoritative. Never change the decision, "
                        "invent policy, or promise payment. If human review "
                        "is required, explicitly say the request is pending "
                        "review and has not been finally approved. Never "
                        "request passwords or full card numbers. Finish "
                        "your response with proper punctuation."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Eligibility: {eligibility}\n"
                        f"Policy explanation: {policy_explanation}\n"
                        f"Customer reason: {reason}\n"
                        f"Customer details: {details[:1000]}\n\n"
                        "Explain the current decision. Do not change it."
                    ),
                },
            ],
            temperature=0.2,
            max_tokens=300,
        )

        if not response.choices:
            print("Groq returned no response choices; using fallback.")
            return fallback

        choice = response.choices[0]
        explanation = choice.message.content

        if choice.finish_reason == "length":
            print("Groq response was truncated; using policy fallback.")
            return fallback

        if not isinstance(explanation, str):
            print("Groq returned an empty or invalid response.")
            return fallback

        explanation = explanation.strip()

        # Reject empty or obviously incomplete responses.
        if len(explanation) < 20:
            print("Groq response was too short; using policy fallback.")
            return fallback

        if explanation[-1] not in ".!?":
            print("Groq response appears incomplete; using policy fallback.")
            return fallback

        return explanation

    except Exception as exc:
        print(f"Groq inference failed: {type(exc).__name__}: {exc}")
        return fallback
