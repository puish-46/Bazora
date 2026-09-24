# Bazora Multi-Vendor Marketplace — Manual Deployment Guide

This manual guide provides end-to-end, step-by-step instructions to deploy the Bazora platform:
- **Backend Service**: Deployed to [Render](https://render.com) (Node.js/Express)
- **Frontend Application**: Deployed to [Vercel](https://vercel.com) (React + Vite SPA)
- **Database**: Cloud Database on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)

> **Important**: Execute each step manually in your own terminal and cloud dashboards as detailed below.

---

## Part A — GitHub Deployment Preparation

Push the latest codebase and deployment configuration to your GitHub repository.

### 1. Open your terminal in the project root:
```bash
cd c:\Users\puish\Desktop\Bazora
```

### 2. Inspect modified and untracked files:
```bash
git status
```
Verify that sensitive files (`.env`, `.env.local`) are ignored and **not** listed under changes to be committed. Only `.gitignore`, `.env.example`, `vercel.json`, and deployment configuration updates should appear.

### 3. Stage all updated deployment files:
```bash
git add .
```

### 4. Commit changes:
```bash
git commit -m "chore: prepare project for production deployment on Render and Vercel"
```

### 5. Push to your GitHub repository:
```bash
git push origin main
```
*(If your default branch is `master`, use `git push origin master`)*

### 6. Confirm repository state:
Visit your repository on [GitHub](https://github.com) and confirm that:
- The latest commit is visible.
- No `.env` files are present in the repository.
- `backend/.env.example`, `frontend/.env.example`, and `DEPLOYMENT_GUIDE.md` are present.

---

## Part B — MongoDB Atlas Database Setup

### 1. Sign In or Create Cluster:
1. Log into [MongoDB Atlas](https://cloud.mongodb.com).
2. Create or select an existing **M0 Free Tier** (or higher) cluster.

### 2. Configure Database User:
1. Navigate to **Security** → **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Set a secure **Username** (e.g., `bazora_admin`) and a strong **Password** (avoid special characters like `@`, `:`, `/` in the password, or percent-encode them).
5. User Privileges: Select **Read and write to any database**.
6. Click **Add User**.

### 3. Configure Network Access (IP Whitelist):
1. Navigate to **Security** → **Network Access**.
2. Click **Add IP Address**.
3. Select **Allow Access from Anywhere** (`0.0.0.0/0`).
   > *Note: Render uses dynamic outbound IP addresses, so allowing access from `0.0.0.0/0` is necessary for seamless database connectivity.*
4. Click **Confirm**.

### 4. Obtain Connection String:
1. Navigate to **Database** → **Clusters**.
2. Click **Connect** on your cluster.
3. Select **Drivers** (Node.js).
4. Copy the connection string format:
   ```text
   mongodb+srv://<username>:<password>@<cluster-name>.xxxxxx.mongodb.net/bazora?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your database user credentials.
6. Ensure the database name `bazora` is specified before the query parameters (`?retryWrites=...`).
7. Keep this connection string ready for Part C.

---

## Part C — Backend Deployment on Render

### 1. Create Web Service:
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub repository (`Bazora`).

### 2. Configure Service Settings:
* **Name**: `bazora-backend` (or your preferred unique service name)
* **Region**: Choose the region closest to you or your MongoDB cluster (e.g., *Singapore*, *Frankfurt*, *Oregon*)
* **Branch**: `main` (or your active default branch)
* **Root Directory**: `backend` *(CRITICAL: Must specify `backend`)*
* **Runtime**: `Node`
* **Build Command**: `npm install`
* **Start Command**: `npm start`
* **Instance Type**: `Free`

### 3. Configure Environment Variables:
Under the **Environment Variables** section on Render, add the following key-value pairs:

| Key | Value / Description | Example |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Service port (Render assigns this automatically; setting `5000` is safe) | `5000` |
| `MONGODB_URI` | Your full MongoDB Atlas connection string from Part B | `mongodb+srv://<user>:<password>@cluster.mongodb.net/bazora?retryWrites=true&w=majority` |
| `JWT_SECRET` | Strong random secret key for JWT authentication (minimum 32 characters) | `your_super_secret_jwt_key_here_bazora_prod` |
| `CLIENT_URL` | Allowed frontend URL(s) for CORS. Initially you can set `http://localhost:5173`. Once Vercel is deployed in Part D, update this to your Vercel domain. | `https://your-bazora.vercel.app,http://localhost:5173` |
| `AI_API_KEY` | *(Optional)* API key if using AI descriptions/moderation (Groq/Gemini/OpenAI) | `your_groq_or_gemini_key` |

### 4. Deploy Service:
1. Click **Create Web Service**.
2. Render will clone the repository, navigate to `backend`, run `npm install`, and launch `node server.js`.
3. Wait for the build and deployment log to output:
   ```text
   MongoDB connected successfully 🚀
   Bazora server running on port 10000
   Your service is live 🎉
   ```

### 5. Identify and Verify Backend URL:
1. Copy your assigned Render URL located under the service title:
   ```text
   https://bazora-backend-xxxx.onrender.com
   ```
2. Open a browser tab or run a curl request to verify the health endpoints:
   - Root Health Check: `https://bazora-backend-xxxx.onrender.com/`
     - Expected response: `{"message":"Bazora backend is running 🚀"}`
   - API Health Check: `https://bazora-backend-xxxx.onrender.com/api/health`
     - Expected response: `{"success":true,"message":"Bazora API is healthy 🚀"}`

---

## Part D — Frontend Deployment on Vercel

### 1. Import Repository:
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New…** → **Project**.
3. Import your GitHub repository (`Bazora`).

### 2. Configure Project Settings:
* **Project Name**: `bazora` (or your preferred name)
* **Framework Preset**: `Vite` (Vercel will usually auto-detect Vite)
* **Root Directory**: Click **Edit** and select `frontend` *(CRITICAL: Must specify `frontend`)*
* **Build Command**: `npm run build` (Default)
* **Output Directory**: `dist` (Default)
* **Install Command**: `npm install` (Default)

### 3. Configure Environment Variables:
Under the **Environment Variables** section on Vercel, add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://bazora-backend-xxxx.onrender.com/api` | Point to your deployed Render URL from Part C, with the `/api` prefix. |

*(Note: The Bazora frontend API client automatically normalizes the URL to include `/api` even if accidentally omitted, but specifying `.../api` is standard practice).*

### 4. Deploy:
1. Click **Deploy**.
2. Vercel will install dependencies in `frontend`, execute `vite build`, and publish the static distribution to its global Edge network.
3. Once completed, Vercel will display the deployment preview and your live production URL:
   ```text
   https://bazora-xxxx.vercel.app
   ```

---

## Part E — Connect Frontend and Backend (Bidirectional CORS Handshake)

For security, modern web applications enforce Cross-Origin Resource Sharing (CORS). Complete the handshake:

### 1. Copy your Vercel Live URL:
Example: `https://bazora-app.vercel.app`

### 2. Update Render Backend Environment Variable:
1. Return to your [Render Dashboard](https://dashboard.render.com).
2. Open your `bazora-backend` service → Click **Environment**.
3. Update or set `CLIENT_URL`:
   ```text
   https://bazora-app.vercel.app,http://localhost:5173
   ```
   *(Multiple origins can be comma-separated. Do not include trailing slashes).*
4. Click **Save Changes**. Render will automatically restart your service with the updated CORS configuration.

---

## Part F — Final Live Verification Checklist

Once both services are deployed and connected, test the live platform on your Vercel URL (`https://<your-project>.vercel.app`):

- [ ] **Home & Catalog**: Website loads cleanly with header, banner, and product catalog.
- [ ] **Customer Registration**: Register a new customer account at `#/register`.
- [ ] **Customer Login & Session**: Log in at `#/login`. Verify that greeting updates in Navbar and session token persists on page refresh.
- [ ] **Product Details**: Click on a product to open `#/products/:id`.
- [ ] **Shopping Cart**: Add items to cart and view `#/cart`.
- [ ] **Checkout Flow**: Place a test order and reach `#/order-confirmation/:id`.
- [ ] **Seller Flow**:
  - Apply or log in as a seller at `#/seller`.
  - Check Storefront setup, Product listing, and Inventory management.
- [ ] **Admin Portal Flow**:
  - Log in with your admin credentials.
  - Access `#/admin` (Overview Dashboard).
  - Test Users (`#/admin/users`), Sellers (`#/admin/sellers`), Products (`#/admin/products`), Orders (`#/admin/orders`), Reports (`#/admin/reports`), and Audit Logs (`#/admin/audit-logs`).
  - Verify cross-module links and "← Dashboard" return buttons.
- [ ] **Console Inspection**: Open browser DevTools (F12) → Network tab:
  - Verify that requests go to `https://<your-render-service>.onrender.com/api/...`
  - Verify that zero requests are directed to `localhost`.
  - Verify there are no CORS origin errors.

---

## Final Deployment Checklist

### Before Deployment
* [ ] Code prepared and hardened for production.
* [ ] `.gitignore` configured to block `.env` and sensitive files.
* [ ] `.env.example` templates created for both backend and frontend.
* [ ] No credentials, passwords, or JWT secrets committed to Git.

### GitHub
* [ ] All project changes committed to `main`.
* [ ] Repository pushed and verified on GitHub.

### Render (Backend)
* [ ] Web service created with root directory set to `backend`.
* [ ] Environment variables added (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`, `CLIENT_URL`).
* [ ] Service deployed and database connected.
* [ ] Backend health endpoints `/` and `/api/health` responding.
* [ ] Render service URL obtained.

### Vercel (Frontend)
* [ ] Project imported with root directory set to `frontend`.
* [ ] Environment variable `VITE_API_URL` configured with the Render `/api` endpoint.
* [ ] SPA rewrites configured (`vercel.json`).
* [ ] Application built and deployed.
* [ ] Live Vercel website URL obtained.

### Submission Links
* **GitHub Repository**: `https://github.com/<your-username>/<your-repo-name>`
* **Live Website (Vercel)**: `https://<your-project>.vercel.app`
* **Live Backend API (Render)**: `https://<your-service>.onrender.com`
