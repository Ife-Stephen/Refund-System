from datetime import datetime, timezone
from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class RefundRequest(Base):
    __tablename__ = "refund_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[str] = mapped_column(String(100), index=True)
    customer_email: Mapped[str] = mapped_column(String(255), index=True)
    purchase_date: Mapped[object] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(String(40))
    item_is_final_sale: Mapped[bool] = mapped_column(Boolean, default=False)
    details: Mapped[str] = mapped_column(Text, default="")
    eligibility: Mapped[str] = mapped_column(String(30), default="needs_review")
    status: Mapped[str] = mapped_column(String(30), default="submitted")
    policy_explanation: Mapped[str] = mapped_column(Text, default="")
    reviewer_note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

class RefundAuditLog(Base):
    __tablename__ = "refund_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    refund_id: Mapped[int] = mapped_column(
        Integer, index=True, nullable=False
    )
    action: Mapped[str] = mapped_column(String(40), nullable=False)
    previous_status: Mapped[str] = mapped_column(String(30), nullable=False)
    new_status: Mapped[str] = mapped_column(String(30), nullable=False)
    reviewer: Mapped[str] = mapped_column(
        String(100), default="support-demo", nullable=False
    )
    reviewer_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
