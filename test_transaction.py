import os
import unittest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
# Force SQLite for local transaction unit tests
DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Import models & schemas
from app import models, schemas, crud
class TestInventorySystem(unittest.TestCase):
    def setUp(self):
        # Create database tables
        models.Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Clear existing tables (fresh setup)
        self.db.query(models.OrderItem).delete()
        self.db.query(models.Order).delete()
        self.db.query(models.Product).delete()
        self.db.query(models.Customer).delete()
        self.db.commit()
    def tearDown(self):
        self.db.close()
        models.Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test.db"):
            os.remove("./test.db")
    def test_unique_sku_validation(self):
        # Create first product
        prod1 = schemas.ProductCreate(
            name="Keyboard",
            sku="KB-123",
            price=Decimal("49.99"),
            stock=10,
            description="Mechanical Keyboard"
        )
        crud.create_product(self.db, prod1)
        # Attempt to create second product with the same SKU
        prod2 = schemas.ProductCreate(
            name="Mouse",
            sku="KB-123", # Duplicate
            price=Decimal("19.99"),
            stock=5,
            description="Gaming Mouse"
        )
        
        with self.assertRaises(HTTPException) as context:
            crud.create_product(self.db, prod2)
            
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("SKU 'KB-123' already exists", context.exception.detail)
    def test_unique_customer_email_validation(self):
        # Create first customer
        cust1 = schemas.CustomerCreate(
            name="Alice",
            email="alice@company.com",
            phone="123",
            address="Street"
        )
        crud.create_customer(self.db, cust1)
        # Attempt to create second customer with the same email
        cust2 = schemas.CustomerCreate(
            name="Bob",
            email="alice@company.com", # Duplicate email
            phone="456",
            address="Street 2"
        )
        
        with self.assertRaises(HTTPException) as context:
            crud.create_customer(self.db, cust2)
            
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Customer with email 'alice@company.com' already exists", context.exception.detail)
    def test_order_placement_and_stock_reduction(self):
        # Setup product and customer
        prod = schemas.ProductCreate(
            name="Monitor",
            sku="MON-01",
            price=Decimal("200.00"),
            stock=15,
            description="4K Monitor"
        )
        db_prod = crud.create_product(self.db, prod)
        cust = schemas.CustomerCreate(
            name="Charlie",
            email="charlie@company.com",
            phone="555",
            address="Avenue"
        )
        db_cust = crud.create_customer(self.db, cust)
        # Place a valid order
        order_data = schemas.OrderCreate(
            customer_id=db_cust.id,
            items=[
                schemas.OrderItemCreate(product_id=db_prod.id, quantity=5)
            ]
        )
        
        db_order = crud.create_order(self.db, order_data)
        
        # Verify order details
        self.assertEqual(db_order.total_amount, Decimal("1000.00"))
        self.assertEqual(db_order.status, "completed")
        
        # Verify stock reduced
        self.db.refresh(db_prod)
        self.assertEqual(db_prod.stock, 10)
    def test_transactional_rollback_on_out_of_stock(self):
        # Setup products and customer
        prod_a = crud.create_product(self.db, schemas.ProductCreate(
            name="Item A", sku="SKU-A", price=Decimal("10.00"), stock=10, description=""
        ))
        prod_b = crud.create_product(self.db, schemas.ProductCreate(
            name="Item B", sku="SKU-B", price=Decimal("20.00"), stock=5, description=""
        ))
        cust = crud.create_customer(self.db, schemas.CustomerCreate(
            name="David", email="david@company.com", phone="123", address=""
        ))
        # Build order: Item A (quantity 3 - OK), Item B (quantity 6 - Insufficient!)
        order_data = schemas.OrderCreate(
            customer_id=cust.id,
            items=[
                schemas.OrderItemCreate(product_id=prod_a.id, quantity=3),
                schemas.OrderItemCreate(product_id=prod_b.id, quantity=6) # Triggers failure
            ]
        )
        with self.assertRaises(HTTPException) as context:
            crud.create_order(self.db, order_data)
            
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("Insufficient stock for product 'Item B'", context.exception.detail)
        # Crucial Verification: Verify transaction rolled back completely!
        # Stock of Item A should NOT have changed (should still be 10, not 7!)
        self.db.refresh(prod_a)
        self.db.refresh(prod_b)
        self.assertEqual(prod_a.stock, 10, "Item A stock was reduced despite order failing. Transaction rollback failed!")
        self.assertEqual(prod_b.stock, 5)
        # No order should have been created
        orders = self.db.query(models.Order).all()
        self.assertEqual(len(orders), 0)
    def test_order_cancellation_restores_stock(self):
        prod = crud.create_product(self.db, schemas.ProductCreate(
            name="Tablet", sku="TAB-01", price=Decimal("300.00"), stock=10, description=""
        ))
        cust = crud.create_customer(self.db, schemas.CustomerCreate(
            name="Eve", email="eve@company.com", phone="123", address=""
        ))
        # Place order for 4 tablets (stock becomes 6)
        order = crud.create_order(self.db, schemas.OrderCreate(
            customer_id=cust.id,
            items=[schemas.OrderItemCreate(product_id=prod.id, quantity=4)]
        ))
        
        self.db.refresh(prod)
        self.assertEqual(prod.stock, 6)
        # Cancel order (stock should return to 10)
        crud.cancel_order(self.db, order.id)
        
        self.db.refresh(prod)
        self.assertEqual(prod.stock, 10)
        
        # Verify status is cancelled
        self.db.refresh(order)
        self.assertEqual(order.status, "cancelled")
if __name__ == "__main__":
    unittest.main()
