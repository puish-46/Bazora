# 🛍️ Bazora — AI-Powered Multi-Vendor E-Commerce Marketplace

**Bazora** is a full-stack, AI-powered multi-vendor e-commerce marketplace built with the **MERN stack**. It provides a complete shopping ecosystem connecting customers, sellers, delivery partners, support staff, and administrators in a single platform.

The platform supports product discovery, variants, inventory management, cart and checkout, multi-vendor order splitting, payments, delivery management, reviews, returns, seller settlements, coupons, notifications, analytics, AI assistance, and administrative controls.

---

## 🚀 Live Demo

* **Frontend:** https://bazora-lovat.vercel.app
* **Backend API:** https://bazora.onrender.com
* **GitHub:** https://github.com/puish-46/Bazora

---

## ✨ Key Features

### 👤 Authentication & Role-Based Access

Bazora supports multiple user roles:

* Customer
* Seller
* Admin
* Support
* Delivery Partner

Features include:

* User registration and login
* JWT-based authentication
* Secure authentication cookies
* Role-based access control
* Protected routes
* Seller application and approval workflow
* Ownership-based authorization

---

### 🛒 Customer Shopping

Customers can:

* Browse products
* Search products
* Filter products
* Sort products
* Browse categories
* View product details
* Select product variants
* Check stock availability
* Add products to cart
* Update quantities
* Manage wishlist
* Apply coupons
* Checkout
* Place orders
* View order history
* Track order status
* Cancel eligible orders
* Request returns
* Request refunds
* Submit reviews
* Contact support

---

### 🏪 Multi-Vendor Marketplace

Bazora is designed as a true multi-vendor marketplace.

Sellers can:

* Register as sellers
* Create their store
* Add products
* Manage product variants
* Set prices
* Configure SKU
* Set initial inventory
* Manage stock
* View seller orders
* Update order status
* Manage returns
* View settlements
* Generate product descriptions using AI
* Generate selling points using AI

A single customer order containing products from multiple sellers can automatically be split into separate seller orders.

---

### 📦 Product & Variant Management

Products and variants are managed separately.

Each product can contain:

* Product information
* Category
* Brand
* Images
* Description
* Price
* Approval status
* Multiple variants

Each variant can contain:

* SKU
* Price
* Attributes
* Stock quantity
* Reserved quantity
* Low-stock threshold

This architecture allows products such as clothing, electronics, accessories, and other categories to support different variants.

---

### 📊 Inventory Management

Bazora includes centralized inventory management.

Features include:

* Variant-level inventory
* Initial stock creation
* Available quantity calculation
* Reserved stock
* Stock reservation during checkout
* Stock release
* Low-stock tracking
* Out-of-stock detection
* Seller inventory dashboard

---

### 💳 Checkout & Payments

The checkout system includes:

* Cart validation
* Server-side price calculation
* Coupon validation
* Stock validation
* Stock reservation
* Multi-vendor order creation
* Mock payment processing
* Payment status tracking
* Order creation

All important pricing and payment-related calculations are validated on the server.

---

### 🚚 Orders & Delivery

Bazora supports the complete order lifecycle:

```text
Cart
 ↓
Checkout
 ↓
Payment
 ↓
Order Creation
 ↓
Seller Processing
 ↓
Packed
 ↓
Shipped
 ↓
Delivery Partner
 ↓
Out for Delivery
 ↓
Delivered
```

Delivery partners can manage assigned deliveries and update delivery status.

---

### 🔄 Cancellations, Returns & Refunds

Customers can:

* Cancel eligible orders
* Request returns
* View return status
* Request refunds

The system handles corresponding order and payment state transitions.

---

### ⭐ Reviews & Ratings

Customers can submit product reviews and ratings.

Features include:

* Rating validation
* Review ownership checks
* Review statistics
* Average rating calculation
* Review moderation/security
* AI-powered review sentiment/summary

---

### 🎟️ Coupons

Bazora includes coupon functionality for promotional campaigns.

Supported functionality includes:

* Coupon codes
* Discount validation
* Expiry checking
* Usage validation
* Server-side discount calculation
* Admin coupon management

---

### 🔔 Notifications

The platform provides notifications for important events such as:

* Orders
* Payments
* Shipping
* Delivery
* Returns
* Seller events
* Administrative actions

---

# 🤖 AI Features

AI is integrated directly into the marketplace rather than being a separate chatbot.

Bazora currently uses **Groq API with Llama 3.3 70B Versatile** as the primary AI provider.

The backend also supports compatible AI providers through environment configuration.

### 🧠 Bazora AI Assistant

Customers can ask questions such as:

```text
Show me wireless headphones under ₹3000
```

```text
What are the best rated products?
```

```text
Show me products for gaming
```

The AI assistant:

1. Receives the user's request
2. Extracts shopping intent
3. Identifies constraints such as price, rating, category, keywords, and sorting
4. Searches the real MongoDB product catalog
5. Checks product reviews and inventory
6. Filters products using server-side rules
7. Sends valid candidates to the AI
8. Allows the AI to rank/explain the real products
9. Returns actual product IDs to the frontend

The AI does **not** invent products that do not exist in the catalog.

### ✨ Other AI Features

* AI shopping assistant
* AI product analysis
* AI review/customer sentiment summary
* AI product description generation
* AI selling-point generation

---

# 🧠 AI Architecture

```text
User
 │
 ▼
Bazora React Frontend
 │
 ▼
POST /api/ai/assistant
 │
 ▼
AI Service
 │
 ├── Intent Extraction
 │
 ├── MongoDB Product Search
 │
 ├── Review Data
 │
 ├── Inventory Data
 │
 └── Product Ranking
 │
 ▼
Groq / Llama 3.3 70B
 │
 ▼
Validated AI Response
 │
 ▼
Real Product Cards
```

---

# 🛡️ Security

Security has been considered throughout the backend.

Implemented protections include:

* JWT authentication
* Role-based authorization
* Ownership validation
* Input validation
* MongoDB ObjectId validation
* Regex escaping
* Pagination limits
* Request body size limits
* Mass-assignment protection
* Server-side price calculation
* Server-side coupon validation
* Server-side order validation
* Payment validation
* Review security
* AI endpoint validation
* Conversation-history sanitization
* Environment-based CORS
* Secret keys stored in environment variables
* Error normalization

Sensitive API keys are never exposed to the frontend.

---

# 📈 Admin Dashboard

Administrators can manage the marketplace through the admin portal.

Admin functionality includes:

* User management
* Seller approval
* Category management
* Product moderation
* Order monitoring
* Coupon management
* Reports
* Analytics
* Audit logs
* Marketplace oversight

---

# 📊 Reports & Analytics

Bazora provides marketplace analytics such as:

* Product statistics
* Order statistics
* Revenue information
* Seller information
* Customer activity
* Inventory information

---

# 📝 Audit Logs

Important administrative and system actions can be recorded through audit logs for better traceability and accountability.

---

# 🏗️ Tech Stack

## Frontend

* React.js
* Vite
* JavaScript
* Tailwind CSS
* React Router
* Zustand
* Axios

## Backend

* Node.js
* Express.js
* JavaScript
* REST API
* JWT Authentication

## Database

* MongoDB
* MongoDB Atlas
* Mongoose

## AI

* Groq API
* Llama 3.3 70B Versatile
* OpenAI-compatible chat completion architecture

## Deployment

* Vercel — Frontend
* Render — Backend
* MongoDB Atlas — Database

---

# 📁 Project Structure

```text
Bazora/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── store/
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── scripts/
│   ├── app.js
│   ├── server.js
│   └── package.json
│
└── README.md
```

---

# ⚙️ Local Development

## 1. Clone the Repository

```bash
git clone https://github.com/puish-46/Bazora.git
cd Bazora
```

---

## 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file:

```env
PORT=5000

MONGO_URI=your_mongodb_atlas_connection_string

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

Start the backend:

```bash
npm run dev
```

Backend:

```text
http://localhost:5000
```

API:

```text
http://localhost:5000/api
```

---

## 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create `.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# 🔐 Environment Variables

Never commit `.env` files or API keys to GitHub.

Example backend environment variables:

```env
MONGO_URI=
JWT_SECRET=

CLIENT_URL=

GROQ_API_KEY=
GROQ_MODEL=

OPENAI_API_KEY=
GEMINI_API_KEY=
AI_API_KEY=
AI_MODEL=
AI_BASE_URL=
```

Only configure the AI provider you actually use.

---

# 🔌 Important API Modules

Bazora exposes REST APIs for major marketplace operations.

```text
/api/auth
/api/users
/api/sellers
/api/categories
/api/products
/api/variants
/api/inventory
/api/cart
/api/orders
/api/payments
/api/reviews
/api/coupons
/api/notifications
/api/support
/api/delivery
/api/settlements
/api/reports
/api/audit-logs
/api/ai
```

---

# 🛍️ Example Shopping Flow

```text
Customer
   ↓
Browse Products
   ↓
Select Product
   ↓
Select Variant
   ↓
Check Stock
   ↓
Add to Cart
   ↓
Checkout
   ↓
Coupon Validation
   ↓
Stock Reservation
   ↓
Payment
   ↓
Order Creation
   ↓
Orders Split By Seller
   ↓
Seller Processing
   ↓
Delivery
   ↓
Customer Receives Product
   ↓
Review
```

---

# 🏪 Example Seller Flow

```text
Seller Registration
        ↓
Admin Approval
        ↓
Create Store
        ↓
Create Product
        ↓
Manage Variants
        ↓
Set Initial Stock
        ↓
Product Moderation
        ↓
Product Approved
        ↓
Customer Purchases
        ↓
Seller Receives Order
        ↓
Process Order
        ↓
Shipment
        ↓
Settlement
```

---

# 🎯 Project Goals

Bazora was designed to demonstrate how a real-world marketplace can combine:

* Full-stack web development
* Multi-vendor architecture
* Secure authentication
* Inventory management
* Order management
* Payment workflows
* AI-powered product discovery
* Analytics
* Role-based systems
* Production-oriented backend architecture

The goal is to build a scalable foundation that can be extended into a real commercial marketplace.

---

# 🔮 Future Improvements

Potential future enhancements include:

* Real payment gateway integration
* Real shipping partner APIs
* Advanced recommendation system
* Personalized AI shopping
* Persistent AI conversation history
* Product embeddings and semantic search
* Vector database integration
* Advanced seller analytics
* Real-time order tracking
* Email/SMS notifications
* Redis caching
* Rate limiting
* Helmet security headers
* Automated CI/CD
* Cloud image optimization
* Advanced product recommendation models

---
