# inventaryorder-management07
An Inventory Order Management System designed to streamline inventory tracking, order processing, and stock management. This application helps businesses efficiently manage products, monitor inventory levels, create and track orders, and generate reports to improve operational efficiency.
# Inventory & Order Management System

## Overview

A full-stack Inventory & Order Management System built using FastAPI, React, PostgreSQL, SQLAlchemy, and Docker. The application provides inventory tracking, customer management, transactional order processing, stock validation, and real-time business metrics.

## Features

### Product Management

* Create, update, and manage products
* Unique SKU validation
* Inventory stock tracking
* Product search functionality

### Customer Management

* Customer registration
* Unique email validation
* Customer purchase history

### Order Management

* Multi-item order checkout
* Atomic database transactions
* Automatic stock deduction
* Order cancellation with stock restoration
* Transaction rollback on failure

### Dashboard Analytics

* Total revenue tracking
* Product count
* Customer count
* Order count
* Low stock monitoring

## Tech Stack

### Backend

* Python
* FastAPI
* SQLAlchemy
* PostgreSQL
* SQLite (Local Development)
* Pydantic

### Frontend

* React
* Vite
* Vanilla CSS

### DevOps

* Docker
* Docker Compose
* Nginx

## Project Structure

inventory-order-management-system/

├── backend/

│ ├── app/

│ │ ├── main.py

│ │ ├── database.py

│ │ ├── models.py

│ │ ├── schemas.py

│ │ └── crud.py

│ ├── requirements.txt

│ ├── Dockerfile

│ └── test_transaction.py

├── frontend/

│ ├── src/

│ │ ├── App.jsx

│ │ ├── main.jsx

│ │ ├── index.css

│ │ └── components/

│ ├── package.json

│ ├── Dockerfile

│ └── nginx.conf

├── docker-compose.yml

├── DEPLOYMENT.md

├── README.md

└── .env.example

## Business Rules

### Product Rules

* SKU must be unique.
* Stock quantity cannot be negative.

### Customer Rules

* Email address must be unique.

### Order Rules

* Orders cannot exceed available stock.
* Transactions are atomic.
* Failed orders trigger rollback.
* Cancelled orders restore stock automatically.

## Running Locally

### Backend

cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload

Backend URL:

http://localhost:8000

Swagger Docs:

http://localhost:8000/docs

### Frontend

cd frontend

npm install

npm run dev

Frontend URL:

http://localhost:5173

## Docker Setup

docker compose up --build

Services:

Frontend: http://localhost:5173

Backend: http://localhost:8000

API Docs: http://localhost:8000/docs

## Testing

pytest test_transaction.py

## Future Improvements

* JWT Authentication
* Role-Based Access Control
* Invoice Generation
* Email Notifications
* Product Categories
* Sales Reports
* Export to Excel/PDF

## Author

Developed as a full-stack assessment project demonstrating modern web development, database transaction handling, and containerized deployment.
