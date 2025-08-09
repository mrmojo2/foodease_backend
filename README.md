# FoodEase Backend

Digital menu & order management REST API for restaurants.  
Built with **Node.js (Express)**, **MySQL**, and **Cloudinary** for media.

---

## Features

- **Auth (Admin)**: login/logout, profile update, password update
- **Menu**: CRUD for menu items, image upload, per-item customization groups/options
- **Categories**: CRUD + image upload
- **Tables**: CRUD + status tracking (`available/occupied/reserved/maintenance`)
- **Orders**: master/detail (order → items → customizations) with status & payment fields
- **Statistics**: daily/weekly/monthly/custom ranges, best sellers, category revenue, YoY, distributions
- **MySQL-first** data model with **transactions** and **FK cascades**

---

## Tech Stack

- **Runtime**: Node.js, Express
- **Database**: MySQL (InnoDB, foreign keys, cascading deletes)
- **Uploads**: Cloudinary (images)
- **Auth**: JWT (HTTP-only cookies)
- **Misc**: `mysql2/promise`, `http-status-codes`, CORS, file uploads

---

## Getting Started

### 1) Prerequisites
- Node.js 18+
- MySQL 8+
- A Cloudinary account (for image uploads)

### 2) Clone
```bash
git clone https://github.com/mrmojo2/foodease_backend.git
cd foodease_backend
```

### 3) Install deps
```bash
npm install
```

### 4) Environment variables
```bash
npm start
```

## API Reference

### Authentication
```
POST   /auth/login
POST   /auth/logout
GET    /auth/me
PATCH  /auth/updateUser
PATCH  /auth/updatePassword
```

### Menu
```
GET    /menu
POST   /menu
GET    /menu/:id
PATCH  /menu/:id
DELETE /menu/:id
PATCH  /menu/image/:id
GET    /menu/category/:categoryId
```

### Categories
```
GET    /categories
POST   /categories
GET    /categories/:id
PATCH  /categories/:id
DELETE /categories/:id
PATCH  /categories/image/:id
```

### Tables
```
GET    /tables
POST   /tables
GET    /tables/:id
PATCH  /tables/:id
DELETE /tables/:id
PATCH  /tables/:id/status
```

### Orders
```
GET    /orders
POST   /orders
GET    /orders/:id
PATCH  /orders/:id
DELETE /orders/:id
PATCH  /orders/:id/status
GET    /orders/table/:tableId
GET    /orders/status/:status
```

### Statistics
```
GET    /stats/daily
GET    /stats/weekly
GET    /stats/monthly
GET    /stats/custom
```

---

## Auth & Security

- JWT stored in HTTP-Only cookie.
- Protect admin routes with auth middleware.

---

## Images

- Stored in Cloudinary.
- Default images for categories/menu items.

---
