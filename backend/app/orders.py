"""Trusted order records used to verify customer refund submissions."""

from sqlalchemy import Boolean, Column, Date, Float, Integer, String
from .database import Base


class TrustedOrder(Base):
    __tablename__ = "trusted_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(100), unique=True, index=True, nullable=False)
    customer_email = Column(String(320), index=True, nullable=False)
    purchase_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    item_is_final_sale = Column(Boolean, nullable=False, default=False)