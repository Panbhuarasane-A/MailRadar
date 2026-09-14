# 📡 MailRadar

> **AI-Powered Email Intelligence and Action Management System**  
> *Transforming email from message-centric to action-centric.*

MailRadar connects to Gmail and Outlook, analyzes incoming emails asynchronously using LLMs (Claude 3.5 Sonnet / Heuristic engine), and reorganizes your inbox around **priority and action** instead of folders and timestamps. Every prioritization decision ships with a transparent natural-language explanation.

---

## 🌟 Key Features

### 1. 🎯 Hotspot Inbox
- High-contrast, dark-first UI with glowing priority tiers:
  - 🔴 **Hotspot (80–100 pts)**: Critical outages, same-day deadlines, VIP approvals.
  - 🟡 **Important (60–79 pts)**: Near-term deadlines, key collaborator updates.
  - 🔵 **Normal (30–59 pts)**: Standard operational correspondence.
  - ⚪ **Low Priority (0–29 pts)**: Newsletters, marketing, non-urgent FYIs.
- **Explainability**: Every email card displays an instant AI reasoning string explaining the *why*.
- **Score Factor Breakdown**: Interactive modal/drawer showing point contributions from Deadline Proximity, VIP/Sender Importance, Action Requirement, Financial Stakes, and Interaction History.

### 2. ⚡ Action Center (Kanban Board)
- Automatically extracts actionable deliverables from emails where `requires_action === true`.
- Three-column Kanban: **To Do**, **In Progress**, and **Done**.
- Never fabricates deadlines: only explicit deadlines are parsed (e.g., "by 5 PM today", "due Thursday").
- Direct links from tasks back to their source emails with single-click navigation.

### 3. ☀️ Daily Brief (AI Morning Digest)
- Executive morning briefing banner synthesizing top priority items.
- Dynamic statistics on 24h impending deadlines, pending approvals, and active tasks.
- Inbound email category distribution visualization.

### 4. 👥 VIP & Sender Intelligence
- Automatic interaction frequency tracking and importance scoring.
- One-click VIP toggle granting sender priority boosts (+25 pts).

### 5. 🔁 Personalization & Feedback Loop
- Thumbs up / thumbs down controls on every email card.
- Adaptive reinforcement adjusts sender importance weights based on user feedback.
- Manual tier overrides with instant retraining adjustments.

### 6. 🎚️ Sensitivity Calibration Slider
- **Conservative (85+ Hotspot)**: Strict filtering for high-pressure executives.
- **Balanced (80+ Hotspot)**: Default optimal calibration.
- **Aggressive (72+ Hotspot)**: Fast-paced project team calibration.

### 7. 🧪 Live Ingestion Simulator
- Built-in test bench to inject real-world scenarios (P0 outages, CFO wire authorizations, design reviews, newsletters) and watch async queue ingestion in real time.

---

## 🛠️ Architecture & Tech Stack

```
MAIL RADAR/
├── server/                 # Express + TypeScript Backend
│   ├── prisma/             # Schema, models & migrations (SQLite / PostgreSQL)
│   ├── src/
│   │   ├── services/
│   │   │   ├── ingestion/  # Normalizer & async queue pipeline
│   │   │   ├── llm/        # Claude 3.5 Sonnet prompt engine & fallback analyzer
│   │   │   ├── scoring/    # Priority scoring algorithm (5 weighted factors)
│   │   │   ├── tasks/      # Automated task extraction & deadline parser
│   │   │   └── personalization/ # Feedback logger & dynamic weight adjuster
│   │   ├── controllers/    # Express route handlers
│   │   ├── routes/         # REST API endpoints
│   │   └── seeds/          # Realistic email dataset seed script
├── client/                 # React 18 + TypeScript Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/     # Header, Sidebar, Radar indicators
│   │   │   ├── hotspot/    # Glowing cards, badges, filters
│   │   │   ├── action-center/ # Kanban board (To Do, In Progress, Done)
│   │   │   ├── daily-brief/   # AI Morning digest & stats
│   │   │   ├── email-detail/  # Explainable AI side drawer & factor breakdown
│   │   │   └── simulator/     # Ingestion test bench
│   │   └── services/       # Typed API client
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node.js v24)
- npm or yarn

### 1. Backend Setup
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed   # Seeds initial multi-tier inbox
npm run dev           # Starts API server on http://localhost:4000
```

*(Optional)* To use Anthropic Claude for generative classification, add your API key in `server/.env`:
```env
ANTHROPIC_API_KEY="sk-ant-..."
```
*Note: If no API key is provided, MailRadar seamlessly runs on its built-in rule-based intelligence engine.*

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev           # Starts Vite dev server on http://localhost:5173
```

---

## 📡 REST API Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/emails` | List prioritized emails (filters: `tier`, `status`, `category`, `search`) |
| `GET` | `/api/emails/:id` | Email detail with factor breakdown & sender profile |
| `PATCH` | `/api/emails/:id/status` | Update status (`unread`, `read`, `archived`) |
| `POST` | `/api/emails/:id/snooze` | Snooze email with resurfacing reason |
| `GET` | `/api/tasks` | Get Action Center tasks |
| `POST` | `/api/tasks` | Create manual task |
| `PATCH` | `/api/tasks/:id/status` | Update Kanban status (`todo`, `in_progress`, `done`) |
| `GET` | `/api/daily-brief` | Generate AI Morning Briefing digest |
| `GET` | `/api/senders` | List sender profiles & VIP rankings |
| `POST` | `/api/senders/vip` | Toggle VIP status for sender |
| `POST` | `/api/feedback` | Submit thumbs up/down or manual tier override |
| `GET` | `/api/settings` | Get sensitivity thresholds and config |
| `PATCH` | `/api/settings/sensitivity` | Adjust sensitivity (`conservative`, `balanced`, `aggressive`) |
| `POST` | `/api/sync/simulate` | Ingest test email into async processing pipeline |
| `POST` | `/api/sync/trigger` | Trigger mailbox synchronization |

---

## 🚀 Deployment

MailRadar is ready for one-click deployment across all major cloud providers. See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for full instructions.

### Quick Deployment Options:
- **Docker Compose**: `docker compose up --build -d`
- **Render / Railway**: Push to GitHub and deploy via `render.yaml` or `railway.json`.
- **Local / VPS Production**:
  ```bash
  npm run build
  npm start
  ```

---

## 🛡️ Non-Negotiable Core Principles

1. **Explainability**: No priority score or category exists without a visible, human-readable natural language reasoning string.
2. **Async by Default**: Email ingestion never blocks on LLM API calls.
3. **Zero Fabricated Deadlines**: Strict rule: if an email does not explicitly state or directly imply a deadline, it remains `null`.
4. **Privacy First**: Sensitive data patterns (credit cards, secrets) are sanitized in server logs.

