from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from decimal import Decimal
from fastapi import HTTPException, status
from app import models, schemas
# --- PRODUCT CRUD ---
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()
def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()
def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()
def create_product(db: Session, product: schemas.ProductCreate):
    # Business Rule: Unique product SKU
    db_product = get_product_by_sku(db, sku=product.sku)
    if db_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product.sku}' already exists."
        )
    
    new_product = models.Product(
        name=product.name,
        sku=product.sku,
        price=product.price,
        stock=product.stock,
        description=product.description
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product
def update_product(db: Session, product_id: int, product_data: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    
    # Check SKU uniqueness if changed
    if product_data.sku and product_data.sku != db_product.sku:
        sku_conflict = get_product_by_sku(db, sku=product_data.sku)
        if sku_conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{product_data.sku}' is already assigned to another product."
            )
            
    for key, value in product_data.model_dump(exclude_unset=True).items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product
def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    db.delete(db_product)
    db.commit()
    return db_product
# --- CUSTOMER CRUD ---
def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()
def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()
def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).offset(skip).limit(limit).all()
def create_customer(db: Session, customer: schemas.CustomerCreate):
    # Business Rule: Unique customer email
    db_customer = get_customer_by_email(db, email=customer.email)
    if db_customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with email '{customer.email}' already exists."
        )
        
    new_customer = models.Customer(
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        address=customer.address
    )
    db.add(new_customer)
    db.commit()
    db.refresh(new_customer)
    return new_customer
def update_customer(db: Session, customer_id: int, customer_data: schemas.CustomerUpdate):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found."
        )
        
    # Check email uniqueness if changed
    if customer_data.email and customer_data.email != db_customer.email:
        email_conflict = get_customer_by_email(db, email=customer_data.email)
        if email_conflict:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{customer_data.email}' is already taken."
            )
            
    for key, value in customer_data.model_dump(exclude_unset=True).items():
        setattr(db_customer, key, value)
        
    db.commit()
    db.refresh(db_customer)
    return db_customer
def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found."
        )
    db.delete(db_customer)
    db.commit()
    return db_customer
# --- ORDER CRUD (WITH TRANSACTION AND STOCK VALIDATION) ---
def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order)\
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))\
        .order_by(models.Order.created_at.desc())\
        .offset(skip).limit(limit).all()
def get_order(db: Session, order_id: int):
    return db.query(models.Order)\
        .options(joinedload(models.Order.customer), joinedload(models.Order.items).joinedload(models.OrderItem.product))\
        .filter(models.Order.id == order_id).first()
def create_order(db: Session, order_data: schemas.OrderCreate):
    # Verify customer exists
    customer = get_customer(db, order_data.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {order_data.customer_id} not found."
        )
    # We use a database transaction. SQLAlchemy handles transaction blocks automatically,
    # but we will manually wrap stock deduction and rollback on failure to ensure safety.
    try:
        total_amount = Decimal("0.00")
        db_order = models.Order(
            customer_id=order_data.customer_id,
            status="completed", # Automatically completed when placed successfully
            total_amount=total_amount
        )
        db.add(db_order)
        db.flush() # Flush to generate db_order.id
        for item in order_data.items:
            product = get_product(db, item.product_id)
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {item.product_id} not found."
                )
            # Business Rule: Inventory validation
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for product '{product.name}' (SKU: {product.sku}). Requested: {item.quantity}, Available: {product.stock}."
                )
            # Business Rule: Automatic stock reduction
            product.stock -= item.quantity
            
            subtotal = product.price * item.quantity
            total_amount += subtotal
            # Create Order Item (capture snapshot price)
            db_item = models.OrderItem(
                order_id=db_order.id,
                product_id=product.id,
                quantity=item.quantity,
                price_at_purchase=product.price
            )
            db.add(db_item)
        db_order.total_amount = total_amount
        db.commit()
        db.refresh(db_order)
        return get_order(db, db_order.id)
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place order: {str(e)}"
        )
def cancel_order(db: Session, order_id: int):
    # Cancelling an order restores the inventory
    db_order = get_order(db, order_id)
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found."
        )
    
    if db_order.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already cancelled."
        )
        
    try:
        # Restore stock for each item
        for item in db_order.items:
            product = get_product(db, item.product_id)
            if product:
                product.stock += item.quantity
                
        db_order.status = "cancelled"
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}"
        )
# --- DASHBOARD METRICS ---
def get_dashboard_metrics(db: Session):
    # Total sales from active (non-cancelled) orders
    total_sales = db.query(func.sum(models.Order.total_amount))\
        .filter(models.Order.status != "cancelled").scalar() or Decimal("0.00")
        
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0
    
    # Low stock thresholds: stock <= 5
    low_stock_threshold = 5
    low_stock_query = db.query(models.Product).filter(models.Product.stock <= low_stock_threshold)
    low_stock_count = low_stock_query.count()
    low_stock_items = low_stock_query.all()
    
    return schemas.DashboardMetrics(
        total_sales=total_sales,
        total_orders=total_orders,
        low_stock_count=low_stock_count,
        low_stock_items=[
            schemas.LowStockProduct(
                id=item.id,
                name=item.name,
                sku=item.sku,
                stock=item.stock
            ) for item in low_stock_items
        ],
        total_products=total_products,
        total_customers=total_customers
    )
