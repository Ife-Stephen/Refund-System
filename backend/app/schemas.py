from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field

RefundReason = Literal["changed_mind", "damaged", "wrong_item", "not_received", "not_as_described", "other"]

class RefundCreate(BaseModel):
    order_id: str = Field(min_length=1, max_length=100)
    customer_email: EmailStr
    purchase_date: date
    amount: float = Field(gt=0, le=1000000)
    reason: RefundReason
    item_is_final_sale: bool = False
    details: str = Field(default="", max_length=3000)

class RefundReview(BaseModel):
    decision: Literal["approve", "reject", "request_information"]
    reviewer_note: str = Field(default="", max_length=2000)

class RefundRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    order_id: str
    customer_email: str
    purchase_date: date
    amount: float
    reason: str
    item_is_final_sale: bool
    details: str
    eligibility: str
    status: str
    policy_explanation: str
    reviewer_note: str
    created_at: datetime
