from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .ai_support import explain_refund
from .database import Base, engine, get_db
from .models import RefundAuditLog, RefundRequest
from .orders import TrustedOrder  # Registers trusted_orders in Base.metadata.
from .crm_models import CRMCustomer, CRMOrder  # Registers mock CRM tables.
from .policy_engine import evaluate_refund
from .schemas import RefundCreate, RefundRead, RefundReview


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AI Refund Support API",
    description="Policy-grounded refund intake and review API (starter MVP)",
    version="0.3.0",
    lifespan=lifespan,
)


@app.get("/")
def root():
    return {
        "message": "AI Refund Support API is running",
        "docs": "/docs",
        "health": "/health",
    }


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "refund-api"}


def _crm_order_payload(order: CRMOrder):
    return {
        "order_id": order.order_id,
        "customer_ref": order.customer.customer_ref,
        "purchase_date": order.purchase_date,
        "total_amount": round(order.total_amount, 2),
        "currency": order.currency,
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "fulfillment_status": order.fulfillment_status,
        "items_summary": order.items_summary,
        "item_count": order.item_count,
        "item_is_final_sale": order.item_is_final_sale,
        "support_notes": order.support_notes,
        "is_demo": order.is_demo,
    }


def _crm_customer_summary(customer: CRMCustomer):
    orders = list(customer.orders)
    return {
        "customer_ref": customer.customer_ref,
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "email": customer.email,
        "phone": customer.phone,
        "segment": customer.segment,
        "joined_at": customer.joined_at,
        "order_count": len(orders),
        "lifetime_order_value": round(sum(order.total_amount for order in orders), 2),
        "is_demo": customer.is_demo,
    }


# DEMO ONLY: these read-only CRM endpoints have no authentication. Do not expose
# them publicly or connect real customer data until admin authentication is added.
@app.get("/crm/customers")
def list_crm_customers(
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(CRMCustomer)
    if q and q.strip():
        pattern = f"%{q.strip()}%"
        query = query.filter(
            (CRMCustomer.customer_ref.ilike(pattern))
            | (CRMCustomer.first_name.ilike(pattern))
            | (CRMCustomer.last_name.ilike(pattern))
            | (CRMCustomer.email.ilike(pattern))
        )
    customers = query.order_by(CRMCustomer.last_name, CRMCustomer.first_name).limit(limit).all()
    return {
        "count": len(customers),
        "customers": [_crm_customer_summary(customer) for customer in customers],
    }


@app.get("/crm/customers/{customer_ref}")
def get_crm_customer(customer_ref: str, db: Session = Depends(get_db)):
    customer = (
        db.query(CRMCustomer)
        .filter(CRMCustomer.customer_ref == customer_ref.strip())
        .first()
    )
    if customer is None:
        raise HTTPException(status_code=404, detail="CRM customer not found")
    result = _crm_customer_summary(customer)
    result["support_notes"] = customer.support_notes
    result["orders"] = [_crm_order_payload(order) for order in customer.orders]
    return result


@app.get("/crm/orders/{order_id}")
def get_crm_order(order_id: str, db: Session = Depends(get_db)):
    order = db.query(CRMOrder).filter(CRMOrder.order_id == order_id.strip()).first()
    if order is None:
        raise HTTPException(status_code=404, detail="CRM order not found")
    return {
        **_crm_order_payload(order),
        "customer": _crm_customer_summary(order.customer),
    }


@app.post("/refunds", response_model=RefundRead, status_code=201)
def create_refund(payload: RefundCreate, db: Session = Depends(get_db)):
    # Verify order ID AND email against a trusted order record. A customer cannot
    # submit their own amount, purchase date, or final-sale flag.
    order = (
        db.query(TrustedOrder)
        .filter(
            TrustedOrder.order_id == payload.order_id.strip(),
            TrustedOrder.customer_email == str(payload.customer_email).strip().lower(),
        )
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found or order details could not be verified. Check the order ID and email.",
        )

    eligibility, explanation = evaluate_refund(
        order.purchase_date,
        order.amount,
        payload.reason,
        order.item_is_final_sale,
        payload.details,
    )

    # A prior request for the same order gets human attention, unless the policy
    # has already produced a hard rejection (e.g. final sale or outside the window).
    previous_request = (
        db.query(RefundRequest)
        .filter(RefundRequest.order_id == order.order_id)
        .order_by(RefundRequest.created_at.desc())
        .first()
    )
    if previous_request and eligibility != "rejected":
        eligibility = "escalated"
        explanation = (
            "A previous refund request exists for this order. A human reviewer must "
            "check for duplicate or related requests before deciding. Original policy check: "
            + explanation
        )

    status = (
        "submitted"
        if eligibility in ("eligible", "needs_review", "escalated")
        else "rejected"
    )

    record = RefundRequest(
        order_id=order.order_id,
        customer_email=order.customer_email.strip().lower(),
        purchase_date=order.purchase_date,
        amount=order.amount,
        reason=payload.reason,
        item_is_final_sale=order.item_is_final_sale,
        details=payload.details.strip(),
        eligibility=eligibility,
        status=status,
        policy_explanation=explanation,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@app.get("/refunds", response_model=list[RefundRead])
def list_refunds(
    email: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(RefundRequest)
    if email:
        query = query.filter(RefundRequest.customer_email == email.strip().lower())
    return query.order_by(RefundRequest.created_at.desc()).limit(limit).all()


@app.get("/refunds/{refund_id}", response_model=RefundRead)
def get_refund(refund_id: int, db: Session = Depends(get_db)):
    record = db.get(RefundRequest, refund_id)
    if not record:
        raise HTTPException(status_code=404, detail="Refund request not found")
    return record


@app.get("/refunds/{refund_id}/explanation")
def get_explanation(refund_id: int, db: Session = Depends(get_db)):
    record = db.get(RefundRequest, refund_id)
    if not record:
        raise HTTPException(status_code=404, detail="Refund request not found")
    return {
        "refund_id": record.id,
        "explanation": explain_refund(
            record.eligibility, record.policy_explanation, record.reason, record.details
        ),
    }

@app.get("/refunds/{refund_id}/audit-logs")
def get_refund_audit_logs(
    refund_id: int,
    db: Session = Depends(get_db),
):
    record = db.get(RefundRequest, refund_id)

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Refund request not found",
        )

    logs = (
        db.query(RefundAuditLog)
        .filter(RefundAuditLog.refund_id == refund_id)
        .order_by(RefundAuditLog.created_at.desc())
        .all()
    )

    return [
        {
            "id": log.id,
            "refund_id": log.refund_id,
            "action": log.action,
            "previous_status": log.previous_status,
            "new_status": log.new_status,
            "reviewer": log.reviewer,
            "reviewer_note": log.reviewer_note,
            "created_at": log.created_at,
        }
        for log in logs
    ]


@app.post("/refunds/{refund_id}/review", response_model=RefundRead)
def review_refund(
    refund_id: int,
    payload: RefundReview,
    db: Session = Depends(get_db),
):
    # Local-development MVP only: We will add authentication/authorization
    # before exposing this endpoint publicly.
    record = db.get(RefundRequest, refund_id)

    if not record:
        raise HTTPException(
            status_code=404,
            detail="Refund request not found",
        )

    if record.status in ("approved", "rejected", "paid"):
        raise HTTPException(
            status_code=409,
            detail=f"Request is already {record.status}",
        )
        
    previous_status = record.status
    decision = payload.decision.strip().lower()
    reviewer_note = (payload.reviewer_note or "").strip()

    if decision == "approve":
        record.status = "approved"
        record.eligibility = "eligible"
        record.policy_explanation = (
            "A support agent reviewed and approved the refund request."
        )

    elif decision == "reject":
        record.status = "rejected"
        record.eligibility = "ineligible"
        record.policy_explanation = (
            "A support agent reviewed and rejected the refund request."
        )

    elif decision == "request_information":
        record.status = "awaiting_information"
        record.eligibility = "needs_review"
        record.policy_explanation = (
            "Additional information is required before a final "
            "refund decision can be made."
        )

    else:
        raise HTTPException(
            status_code=422,
            detail=(
                "Invalid decision. Use approve, reject, "
                "or request_information."
            ),
        )

    record.reviewer_note = reviewer_note
    
    audit_entry = RefundAuditLog(
        refund_id=record.id,
        action=decision,
        previous_status=previous_status,
        new_status=record.status,
        reviewer="support-demo",
        reviewer_note=reviewer_note,
        )
    db.add(audit_entry)
    db.commit()
    db.refresh(record)
    return record


