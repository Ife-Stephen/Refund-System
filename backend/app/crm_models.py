"""Demo CRM customer profiles and order history models.

All records seeded by this project are fictional. Protect CRM endpoints and
replace the seed data with a trusted order-system integration before production.
"""
from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class CRMCustomer(Base):
    __tablename__ = "crm_customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_ref = Column(String(24), unique=True, index=True, nullable=False)
    first_name = Column(String(80), nullable=False)
    last_name = Column(String(80), nullable=False)
    email = Column(String(320), unique=True, index=True, nullable=False)
    phone = Column(String(40), nullable=False, default="")
    segment = Column(String(40), nullable=False, default="standard")
    joined_at = Column(Date, nullable=False)
    support_notes = Column(Text, nullable=False, default="")
    is_demo = Column(Boolean, nullable=False, default=True)

    orders = relationship(
        "CRMOrder", back_populates="customer", order_by="CRMOrder.purchase_date.desc()"
    )


class CRMOrder(Base):
    __tablename__ = "crm_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(100), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("crm_customers.id"), index=True, nullable=False)
    purchase_date = Column(Date, nullable=False)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    order_status = Column(String(30), nullable=False, default="completed")
    payment_status = Column(String(30), nullable=False, default="paid")
    fulfillment_status = Column(String(30), nullable=False, default="delivered")
    items_summary = Column(String(500), nullable=False)
    item_count = Column(Integer, nullable=False, default=1)
    item_is_final_sale = Column(Boolean, nullable=False, default=False)
    support_notes = Column(Text, nullable=False, default="")
    is_demo = Column(Boolean, nullable=False, default=True)

    customer = relationship("CRMCustomer", back_populates="orders")
