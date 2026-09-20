# 🚀 Mail Hinge AI — Official Production Deployment & Google Verification Guide

Mail Hinge AI is architected as a **high-performance unified full-stack application** where the Node.js/Express backend serves both the secured REST API endpoints (`/api/*`) and the compiled React (Vite) Single Page Application on a single port.

---

## 🌟 Quick Overview of Deployment Options

| Platform / Method | Best For | Deploy Command / Config |
| :--- | :--- | :--- |
| **Render** | 1-Click Turnkey Cloud Hosting (Free/Paid) | `render.yaml` (Pre-configured Blueprint) |
| **Railway** | Instant PostgreSQL + Container Hosting | `railway.json` / `Procfile` |
| **Docker / Compose** | Any VPS, Cloud VM, DigitalOcean, or AWS EC2 | `docker compose up --build -d` |
| **Fly.io** | Global Edge Deployment | `fly launch` / `Dockerfile` |
| **Vercel + Neon/Supabase** | Frontend Edge + Serverless Backend | `vercel.json` |

---

## 🛠️ Required Production Environment Variables

Configure the following environment variables on your cloud hosting dashboard (Render / Railway / Docker / Vercel):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Listening port for the application | `4000` (auto-injected by most cloud hosts) |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://user:pass@ep-xyz.neon.tech/mailradar?sslmode=require` |
| `JWT_SECRET` | 64-char random string for access tokens | Generated securely |
| `COOKIE_SECRET` | 64-char random string for signed cookies | Generated securely |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `your-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-your-secret` |
| `GOOGLE_REDIRECT_URI` | Production OAuth Callback URL | `https://yourdomain.com/api/auth/google/callback` |
| `FRONTEND_URL` | Production Frontend Root URL | `https://yourdomain.com` |
| `GEMINI_API_KEY` | Optional Gemini API key for live AI scoring | `AIzaSy...` |

---

## 📦 Option 1: 1-Click Deploy on Render (Recommended)

1. Push your repository to **GitHub**.
2. Go to **[dashboard.render.com](https://dashboard.render.com/)** $\rightarrow$ **New +** $\rightarrow$ **Blueprint**.
3. Connect your repository. Render will automatically detect `render.yaml`:
   - **Build Command**: `npm install && npm install --prefix server && npm install --prefix client && npm run client:build && npm run server:build`
   - **Start Command**: `npm start`
   - **Health Check**: `/health`
4. Add your **PostgreSQL Database** (from Render Postgres, Supabase, or Neon).
5. Add your Google OAuth environment variables.
6. Click **Apply**. Your application will be live at `https://your-app-name.onrender.com` (or your custom domain).

---

## 🛡️ Step-by-Step Google OAuth Verification Guide (To Remove the Warning)

To remove the *"Google hasn't verified this app"* warning for all external users worldwide, follow this exact checklist:

### 1. Host Public Legal Pages (Built-in)
Google requires publicly accessible Privacy Policy and Terms of Service URLs. Mail Hinge AI includes these pre-built at:
- **Privacy Policy**: `https://yourdomain.com/privacy`
- **Terms of Service**: `https://yourdomain.com/terms`
- **Google Limited Use Disclosure**: `https://yourdomain.com/legal`

### 2. Configure Google Cloud Console OAuth Consent Screen
1. Go to [Google Cloud Console $\rightarrow$ APIs & Services $\rightarrow$ OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent).
2. Set **User Type**: **External**.
3. Fill in the App Information:
   - **App Name**: `Mail Hinge AI`
   - **User Support Email**: `panbhuofficial@gmail.com`
   - **App Domain**:
     - Home Page: `https://yourdomain.com`
     - Privacy Policy: `https://yourdomain.com/privacy`
     - Terms of Service: `https://yourdomain.com/terms`
   - **Authorized Domains**: `yourdomain.com`
   - **Developer Contact Email**: `panbhuofficial@gmail.com`
4. Under **Scopes**: Add `https://www.googleapis.com/auth/gmail.readonly`, `email`, and `profile`.
5. Under **Credentials $\rightarrow$ OAuth 2.0 Client IDs**:
   - **Authorized JavaScript Origins**: `https://yourdomain.com`
   - **Authorized Redirect URIs**: `https://yourdomain.com/api/auth/google/callback`

### 3. Record YouTube Demo Video (Google Requirement)
Google requires a 1–2 minute **unlisted YouTube video** demonstrating:
1. The **OAuth Client ID** clearly visible in the browser address bar during login (`client_id=...apps.googleusercontent.com`).
2. The user clicking **Sign In with Google** and consenting to permissions.
3. Demonstrating how Mail Hinge AI uses the Gmail data (priority scoring engine, deadline extraction, and Kanban task generation).

### 4. Copy-Paste Scope Justification Statement for Google Review
When prompted for **Scope Justification**, copy-paste this statement:

```text
Mail Hinge AI is an AI-powered email intelligence and task prioritization dashboard. 

We request the 'https://www.googleapis.com/auth/gmail.readonly' scope solely to fetch incoming email headers and message content to:
1. Automatically compute priority and urgency scores for incoming work emails.
2. Extract critical deadlines and action items into a Kanban task management board.
3. Help users focus on high-priority correspondence without manual triage.

Data Protection & Compliance Statement:
- User email data is processed strictly for the individual user's personal inbox organization.
- We do NOT sell, rent, or commercialize email data.
- User data is never used for advertising, marketing, or training generalized public AI models.
- All data handling strictly complies with the Google API Services User Data Policy, including the Limited Use requirements.
```

### 5. Submit for Review
Click **Submit for Verification**. Google will review your submission and email you confirmation within 3–5 business days.
