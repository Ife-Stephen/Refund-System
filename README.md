# AI Refund Support System

An AI-assisted e-commerce refund support application built with **Next.js, FastAPI, PostgreSQL, Docker, and Groq**. The system helps customers submit and track refund requests while enabling support staff to review decisions and inspect an audit history.

## Features

- **Refund requests:** Submit refund requests with order details, reasons, and supporting information.
- **Policy-based eligibility:** Evaluate requests against refund rules, including the return window, final-sale restrictions, and human-review thresholds.
- **AI-generated explanations:** Use Groq to produce customer-friendly explanations grounded in the policy engine's decision.
- **Fallback explanations:** Continue providing policy-based explanations when the AI service is unavailable or no API key is configured.
- **Refund tracking:** View a refund's status, eligibility assessment, and explanation.
- **Support dashboard:** Search and review refund requests, then approve, reject, or request additional information.
- **Audit history:** Record review actions, previous and new statuses, reviewer notes, and timestamps.
- **Mock CRM and orders:** Use fictional customer profiles and order histories for development and demonstration.
- **Containerized services:** Run the application and its dependencies with Docker Compose.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, JavaScript, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| AI integration | Groq API using the OpenAI-compatible Python client |
| Infrastructure | Docker and Docker Compose |

## Architecture

The application separates the customer interface, support interface, backend business logic, database, and AI explanation service.

1. The Next.js frontend provides the customer refund flow, refund tracking, and support dashboard.
2. Next.js API routes proxy frontend requests to the FastAPI backend.
3. FastAPI validates requests and applies the refund policy engine.
4. SQLAlchemy persists refund requests, CRM/order records, and audit events in PostgreSQL.
5. The AI explanation service sends the policy decision and relevant customer-provided details to Groq.
6. If AI generation is unavailable, the service returns a policy-based fallback explanation.

**Important design principle:** The policy engine and backend determine eligibility and workflow status. The language model explains the decision; it does not authorize a refund or override the policy engine.

## Prerequisites

- Docker Desktop with Docker Compose
- A GitHub account if you want to clone the repository
- A Groq API key for live AI-generated explanations

## Environment Configuration

Create a local `.env` file in the project root. Do not commit real credentials.

Example:

```dotenv
POSTGRES_DB=refunds
POSTGRES_USER=postgres
POSTGRES_PASSWORD=replace_with_a_local_password

DATABASE_URL=postgresql+psycopg://postgres:postgres@db:5432/refunds

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL_ID=openai/gpt-oss-20b
```

The database URL credentials must match the PostgreSQL configuration in Docker Compose. If you change the database username or password, update the URL accordingly.

The Groq API key is required for live model inference. Without it, the application can use its policy-based fallback explanation.

Never commit `.env`, `.env.local`, API keys, or production credentials. The `.env.example` file should contain placeholders only.

## Run with Docker Compose

From the repository root, run:

```bash
docker compose up --build
```

Once the services have started, open:

- Customer application: http://localhost:3000
- Support dashboard: http://localhost:3000/admin
- Refund tracking: http://localhost:3000/track
- Backend API: http://localhost:8000
- Interactive API documentation: http://localhost:8000/docs

These URLs assume the corresponding services and port mappings are configured in `docker-compose.yml`.

To stop the application:

```bash
docker compose down
```

To stop the application and remove its database volume as well, use the volume-removal option only when you intend to delete the persisted local database data.

## Mock Data

The repository includes fictional mock customer and order data for testing and demonstration.

If the seed script is not run automatically by Docker Compose, seed the database using the project's documented seed procedure. The backend seed script is located at `backend/scripts/seed_mock_crm.py`.

All sample customer and order information is fictional.

## How AI Integration Works

The backend uses the OpenAI-compatible Python client with Groq's API endpoint.

The explanation service receives:

- The eligibility assessment
- The policy engine's explanation
- The customer's selected refund reason
- A limited portion of the customer's supporting details

The model is instructed to provide a concise, customer-friendly explanation without inventing policy, changing the decision, or promising payment before approval.

If the API key is missing, the model call fails, or the response is incomplete or invalid, the service returns a deterministic policy-based fallback.

AI output is explanatory, not authoritative. Refund decisions remain under backend policy and review logic.

## Refund Policy and Assumptions

The application uses configurable policy rules. The current implementation includes:

- A 30-day return window by default
- Final-sale items are not eligible by default
- Refunds above $500 require human review
- Certain reasons, including damaged items, incorrect items, and undelivered orders, can qualify for review
- Suspicious, conflicting, or otherwise uncertain requests may require further review

The policy configuration is the source of truth; confirm the current policy file before changing these assumptions.

## Security and Trade-offs

- The included CRM and order records are fictional demonstration data.
- The Groq API key must be supplied through environment configuration, not source code.
- AI-generated explanations may be incorrect; the policy engine remains authoritative.
- The fallback prioritizes availability and predictable policy messaging over natural-language variation.
- The application is intended as an assessment/demo unless authentication, authorization, deployment security, and production monitoring have been configured and verified.
- Support review endpoints should be protected with appropriate authentication and authorization before public production use.

## 🎥 Project Demo

Watch the demo video to see the AI-powered refund support system in action.

[**▶ Watch the Demo Video**](https://screenrec.com/share/iuY7haT84o)

The walkthrough covers:

- Customer refund request submission
- Refund tracking and AI-generated explanations
- Admin dashboard and refund review workflow
- Audit history and status updates
- Application architecture and Docker-based setup
