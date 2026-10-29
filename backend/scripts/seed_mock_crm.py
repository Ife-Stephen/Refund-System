"""Idempotently seed 15 fictional customers and 36 order-history records.

Run from the backend directory:
    python -m scripts.seed_mock_crm

This also syncs every seeded order into trusted_orders for refund verification.
Existing customer/order records are never overwritten.
"""
import json
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import Base, engine
from app.models import RefundRequest  # Register the existing refund table.
from app.orders import TrustedOrder
from app.crm_models import CRMCustomer, CRMOrder  # Register CRM tables.

FIXTURE_PATH = Path(__file__).resolve().parents[2] / "data" / "mock_crm_seed.json"


def main():
    fixture = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    Base.metadata.create_all(bind=engine)

    customers_created = 0
    orders_created = 0
    trusted_created = 0

    with Session(engine) as db:
        customer_by_ref = {}
        for source in fixture["customers"]:
            customer = (
                db.query(CRMCustomer)
                .filter(CRMCustomer.customer_ref == source["customer_ref"])
                .first()
            )
            if customer is None:
                customer = (
                    db.query(CRMCustomer)
                    .filter(CRMCustomer.email == source["email"].lower())
                    .first()
                )
            if customer is None:
                customer = CRMCustomer(
                    customer_ref=source["customer_ref"],
                    first_name=source["first_name"],
                    last_name=source["last_name"],
                    email=source["email"].lower(),
                    phone=source.get("phone", ""),
                    segment=source.get("segment", "standard"),
                    joined_at=date.today() - timedelta(days=int(source.get("joined_days_ago", 365))),
                    support_notes=source.get("support_notes", ""),
                    is_demo=True,
                )
                db.add(customer)
                db.flush()
                customers_created += 1
            customer_by_ref[source["customer_ref"]] = customer

        db.flush()

        for source in fixture["orders"]:
            customer = customer_by_ref[source["customer_ref"]]
            purchase_date = date.today() - timedelta(days=int(source["days_ago"]))
            order = (
                db.query(CRMOrder)
                .filter(CRMOrder.order_id == source["order_id"])
                .first()
            )
            if order is None:
                order = CRMOrder(
                    order_id=source["order_id"],
                    customer=customer,
                    purchase_date=purchase_date,
                    total_amount=float(source["total_amount"]),
                    currency=source.get("currency", "USD"),
                    order_status=source.get("order_status", "completed"),
                    payment_status=source.get("payment_status", "paid"),
                    fulfillment_status=source.get("fulfillment_status", "delivered"),
                    items_summary=source["items_summary"],
                    item_count=int(source.get("item_count", 1)),
                    item_is_final_sale=bool(source.get("item_is_final_sale", False)),
                    support_notes=source.get("support_notes", ""),
                    is_demo=True,
                )
                db.add(order)
                db.flush()
                orders_created += 1

            # Keep the refund API's trusted lookup table aligned with these fixtures.
            trusted = (
                db.query(TrustedOrder)
                .filter(TrustedOrder.order_id == source["order_id"])
                .first()
            )
            if trusted is None:
                db.add(
                    TrustedOrder(
                        order_id=source["order_id"],
                        customer_email=customer.email.lower(),
                        purchase_date=purchase_date,
                        amount=float(source["total_amount"]),
                        item_is_final_sale=bool(source.get("item_is_final_sale", False)),
                    )
                )
                trusted_created += 1

        db.commit()

    print("Mock CRM seed complete.")
    print(f"Customer profiles present: {len(fixture['customers'])}")
    print(f"Order-history records in fixture: {len(fixture['orders'])}")
    print(f"New CRM customer records created: {customers_created}")
    print(f"New CRM orders created: {orders_created}")
    print(f"New trusted order records created: {trusted_created}")
    print("All records are fictional. Re-running the script will not overwrite existing records.")


if __name__ == "__main__":
    main()
