# Balavidya Deployment Guide

## 1. Database (Supabase) ✅ Connected

Your database is live on Supabase and initialized with all tables, constraints, and test seed data.

- **Supabase Host:** `aws-0-ap-southeast-1.pooler.supabase.com`
- **Seeded Test Student:** `BV-0824-019` / `password123`
- **Seeded Test Admin:** `admin` / `admin123`

---

## 2. Local Development

To run the full stack locally:
```powershell
# Start local server (serves both API & Frontend on http://localhost:3000)
node server/index.js
```

---

## 3. Deploying to Render.com (Free Cloud Hosting)

### Step A: Push Code to GitHub
1. Create a repository on GitHub (e.g. `balavidya-lms`).
2. Push your project code:
   ```bash
   git init
   git add .
   git commit -m "Initial Balavidya release with Supabase backend"
   git branch -M main
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/balavidya-lms.git
   git push -u origin main
   ```

### Step B: Create a Web Service on Render
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub account and select your `balavidya-lms` repository.
4. Configure the service settings:
   - **Name:** `balavidya-lms`
   - **Region:** `Singapore (Southeast Asia)` *(closest to your Supabase instance)*
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server/index.js`
   - **Instance Type:** `Free`

### Step C: Set Environment Variables on Render
Under **Environment Variables**, add:
| Key | Value |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://postgres.zdunbzpbrlknetpwkmwl:%24%24Dhanunjaya009@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | `balavidya_production_secret_key_2026_998127` *(or any 32+ char secret)* |
| `CORS_ORIGIN` | `*` |

5. Click **Create Web Service**.
6. Render will build and deploy your app. Within 1–2 minutes, you will receive a live public HTTPS URL (e.g., `https://balavidya-lms.onrender.com`).
