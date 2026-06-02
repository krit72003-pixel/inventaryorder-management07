from typing import List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app import schemas, crud
# Initialize database tables on startup
Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="Inventory & Order Management System API",
    description="Backend Python FastAPI for managing products, customers, orders, and automatic inventory updates.",
    version="1.0.0"
)
# Configure CORS to allow the React frontend to communicate with the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins in development and deployment demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/", tags=["General"])
def read_root():
    return {
        "status": "online",
        "message": "Inventory & Order Management API is active.",
        "documentation": "/docs"
    }
# --- DASHBOARD METRICS ---
@app.get("/metrics", response_model=schemas.DashboardMetrics, tags=["Dashboard"])
def read_dashboard_metrics(db: Session = Depends(get_db)):
    """
    Get aggregated system statistics, sales summary, and low stock warnings.
    """
    return crud.get_dashboard_metrics(db)
# --- PRODUCTS ENDPOINTS ---
@app.get("/products", response_model=List[schemas.ProductResponse], tags=["Products"])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_products(db, skip=skip, limit=limit)
@app.get("/products/{product_id}", response_model=schemas.ProductResponse, tags=["Products"])
def read_product(product_id: int, db: Session = Depends(get_db)):
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db_product
@app.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED, tags=["Products"])
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    return crud.create_product(db=db, product=product)
@app.put("/products/{product_id}", response_model=schemas.ProductResponse, tags=["Products"])
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    return crud.update_product(db=db, product_id=product_id, product_data=product)
@app.delete("/products/{product_id}", response_model=schemas.ProductResponse, tags=["Products"])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    return crud.delete_product(db=db, product_id=product_id)
# --- CUSTOMERS ENDPOINTS ---
@app.get("/customers", response_model=List[schemas.CustomerResponse], tags=["Customers"])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_customers(db, skip=skip, limit=limit)
@app.get("/customers/{customer_id}", response_model=schemas.CustomerResponse, tags=["Customers"])
def read_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_customer
@app.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED, tags=["Customers"])
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    return crud.create_customer(db=db, customer=customer)
@app.put("/customers/{customer_id}", response_model=schemas.CustomerResponse, tags=["Customers"])
def update_customer(customer_id: int, customer: schemas.CustomerUpdate, db: Session = Depends(get_db)):
    return crud.update_customer(db=db, customer_id=customer_id, customer_data=customer)
@app.delete("/customers/{customer_id}", response_model=schemas.CustomerResponse, tags=["Customers"])
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    return crud.delete_customer(db=db, customer_id=customer_id)
# --- ORDERS ENDPOINTS ---
@app.get("/orders", response_model=List[schemas.OrderResponse], tags=["Orders"])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_orders(db, skip=skip, limit=limit)
@app.get("/orders/{order_id}", response_model=schemas.OrderResponse, tags=["Orders"])
def read_order(order_id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db, order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order
@app.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED, tags=["Orders"])
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Place a new order. Creates order items and automatically reduces stocks atomically.
    Raises 400 Bad Request if product stock is insufficient.
    """
    return crud.create_order(db=db, order_data=order)
@app.post("/orders/{order_id}/cancel", response_model=schemas.OrderResponse, tags=["Orders"])
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    """
    Cancel an active order and restore items back into product inventory.
    """
    return crud.cancel_order(db=db, order_id=order_id)
