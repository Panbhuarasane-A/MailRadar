# MailRadar: Comprehensive Architecture, Data Flow & Legal/Compliance Audit

**Version:** 1.0.0  
**Generated:** 2026-09-16  
**Document Status:** Complete Audit & Reference Architecture  

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
   - [2.1 High-Level Architecture Diagram](#21-high-level-architecture-diagram)
   - [2.2 Ingestion Connectors](#22-ingestion-connectors)
   - [2.3 Queue & Asynchronous Processing Engine](#23-queue--asynchronous-processing-engine)
   - [2.4 Intelligence & Extraction Layer (LLM & Heuristics)](#24-intelligence--extraction-layer-llm--heuristics)
   - [2.5 5-Factor Priority Scoring Engine](#25-5-factor-priority-scoring-engine)
   - [2.6 Task, Deadline & ATS Crawler Pipeline](#26-task-deadline--ats-crawler-pipeline)
   - [2.7 Frontend & Sandboxed Gmail-Style Rendering Engine](#27-frontend--sandboxed-gmail-style-rendering-engine)
3. [Data Models & Schema Reference](#3-data-models--schema-reference)
4. [Legal & Regulatory Audit](#4-legal--regulatory-audit)
   - [4.1 Google API Services User Data Policy & CASA Verification](#41-google-api-services-user-data-policy--casa-verification)
   - [4.2 Privacy Laws: GDPR, CCPA/CPRA, and India DPDP Act 2023](#42-privacy-laws-gdpr-ccpacpra-and-india-dpdp-act-2023)
   - [4.3 Third-Party AI Data Transfer & Retention (Anthropic Claude API)](#43-third-party-ai-data-transfer--retention-anthropic-claude-api)
   - [4.4 Telegram Scraping & External Crawling Legality](#44-telegram-scraping--external-crawling-legality)
   - [4.5 Intellectual Property, Trademarks & Brand Fair Use](#45-intellectual-property-trademarks--brand-fair-use)
5. [Cybersecurity & Vulnerability Assessment](#5-cybersecurity--vulnerability-assessment)
   - [5.1 Threat Matrix & Risk Ratings](#51-threat-matrix--risk-ratings)
   - [5.2 Detailed Vulnerability Analysis & Remediation](#52-detailed-vulnerability-analysis--remediation)
6. [Production Launch Checklist](#6-production-launch-checklist)

---

## 1. Executive Summary

**MailRadar** is an intelligent, high-throughput email prioritization, task extraction, and communication triage platform. It aggregates messages from Google Gmail OAuth, standard IMAP/MIME servers, and public Telegram channels, processing them through a hybrid pipeline of Large Language Models (Anthropic Claude 3.5 Sonnet) and deterministic heuristic rule engines.

The platform computes a dynamic **Priority Score (0–100)** across 5 weighted dimensions, classifies emails into structured priority tiers (`hotspot`, `important`, `normal`, `low`), identifies actionable tasks with explicit deadlines, crawls external applicant tracking systems (ATS) to verify expiration dates, and renders emails in a sandboxed, responsive Gmail-inspired user interface.

---

## 2. End-to-End System Architecture

### 2.1 High-Level Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                            MAILRADAR ECOSYSTEM                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                     │
         ┌──────────────────────────────┬────────────┴─────────────────┬──────────────────────────────┐
         ▼                              ▼                              ▼                              ▼
  ┌──────────────┐              ┌──────────────┐                ┌──────────────┐              ┌──────────────┐
  │ Google OAuth │              │  IMAP / MIME │                │   Telegram   │              │   Simulator  │
  │  (REST API)  │              │  (Port 993)  │                │ Web Preview  │              │ (Mock Ingest)│
  └──────┬───────┘              └──────┬───────┘                └──────┬───────┘              └──────┬───────┘
         │                             │                               │                             │
         └─────────────────────────────┼───────────────────────────────┴─────────────────────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │   Ingestion Queue Worker  │
                         │    (BullMQ / In-Memory)   │
                         └─────────────┬─────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │     LLM Analyzer &        │
                         │ Heuristic Rule Engine (AI)│
                         └─────────────┬─────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │  5-Factor Priority Engine │
                         │   (Explainable Scoring)   │
                         └─────────────┬─────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │  Task & Deadline Crawler  │
                         │    (ATS Link Bypass)      │
                         └─────────────┬─────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │     PostgreSQL (Neon)     │
                         │       (Prisma ORM)        │
                         └─────────────┬─────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │   React 18 + Vite Web UI  │
                         │ (Sandboxed Gmail Renderer)│
                         └───────────────────────────┘
```

---

### 2.2 Ingestion Connectors

MailRadar interfaces with multiple email and message providers:

1. **Google OAuth 2.0 Ingestion (`googleOAuthService.ts`)**:
   - **Scope**: `https://www.googleapis.com/auth/gmail.readonly`
   - **Auth Flow**: Initiates Google OAuth consent screen, validates `state`, receives authorization code, and requests access + refresh tokens from `https://oauth2.googleapis.com/token`.
   - **Data Fetching**: Traverses `https://gmail.googleapis.com/gmail/v1/users/me/messages`, queries full MIME representations (`format=full`), and recursively decodes nested base64url payloads to preserve rich authentic HTML structures (`text/html`) and plain-text fallbacks (`text/plain`).
   - **Pagination**: Supports batch cursor pagination for inboxes containing thousands of historical messages.

2. **Standard IMAP Mailbox Engine (`realMailboxService.ts`)**:
   - **Protocol**: Secure IMAP over SSL/TLS on port 993 (or STARTTLS on 143/587).
   - **Parser**: Utilizes `node-imap` and `@nodemailer/mailparser` to resolve complex multi-part multipart/alternative/mixed MIME trees.
   - **Metadata Extraction**: Extracts Message-ID, In-Reply-To, References, To, From, CC, BCC, Subject, and Date.

3. **Public Telegram Announcement Scraper (`telegramScraperService.ts` & `telegramService.ts`)**:
   - Scrapes public channels (such as recruitment boards, college placement updates, engineering alerts) via public web preview endpoints (`https://t.me/s/<channel>`).
   - Converts HTML markup with Cheerio into normalized text blocks and identifies embedded application hyperlinks.

4. **Interactive Sandbox Simulator (`syncController.ts`)**:
   - Ingests mock production SEV-0 incidents, critical bank wire requests, campus placement notifications, and promotional digests for instant testing without connecting live email accounts.

---

### 2.3 Queue & Asynchronous Processing Engine (`ingestionQueue.ts`)

- **Architecture**: Employs an asynchronous Producer-Consumer queue pattern using `BullMQ`.
- **Fault-Tolerance Fallback**: Automatically checks for an active Redis instance. If Redis is unavailable, it gracefully fails over to an internal in-memory concurrent worker queue to prevent server crashes during offline development.
- **Worker Concurrency**: Configured to process batch sync jobs with rate limiting, preventing downstream API throttling.

---

### 2.4 Intelligence & Extraction Layer (`analyzer.ts` & `prompts.ts`)

MailRadar executes a dual-layer AI strategy:

#### Layer 1: Production Large Language Model (Anthropic Claude 3.5 Sonnet)
- **Model**: `claude-3-5-sonnet-20241022`
- **Output Schema Validation**: Uses `zod` (`AnalysisSchema`) to guarantee structured JSON output matching:
  - `category`: `work | finance | academic | personal | promotional | other`
  - `intent`: `request | fyi | meeting_invite | approval_needed | complaint | deadline_notice | other`
  - `urgency`: `low | medium | high | critical`
  - `requires_action`: `boolean`
  - `deadline`: `ISO-8601 string | null`
  - `action_summary`: `string | null`
  - `reasoning`: Natural language justification for explainability
  - `financial_or_professional_stakes`: `none | moderate | high | critical`

#### Layer 2: Deterministic Heuristic Rule Engine (Zero-Cost & Offline Fallback)
If no API key is present or if Anthropic API encounters rate limits, MailRadar executes an instant heuristic classifier:
- **Security & OTPs**: Detects 2FA codes, password reset requests, and time-sensitive verification tokens with strict 10–60 minute deadlines.
- **Campus Placement & Job Drives**: Evaluates placement notices, interviews, and application cutoffs.
- **Engineering Outages**: Catches SEV-0/P0 outage alerts, database failovers, and server downtime notifications.
- **Executive Approvals & Wires**: Prioritizes payroll approvals, wire confirmations, and legal compliance requests.

---

### 2.5 5-Factor Priority Scoring Engine (`priorityEngine.ts`)

Calculates a normalized score ($0.0 \le \text{Score} \le 100.0$) using weighted factor contributions:

$$\text{Final Score} = w_{\text{deadline}} \cdot S_{\text{deadline}} + w_{\text{sender}} \cdot S_{\text{sender}} + w_{\text{action}} \cdot S_{\text{action}} + w_{\text{stakes}} \cdot S_{\text{stakes}} + w_{\text{history}} \cdot S_{\text{history}}$$

```
┌──────────────────────────────┬──────────────┬────────────────────────────────────────────────────────┐
│ Factor                       │ Weight       │ Logic Description                                      │
├──────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ 1. Deadline Proximity        │ 30%          │ Scores higher as deadline approaches (<=24h = 90-100) │
│ 2. Sender Importance & VIP   │ 25%          │ VIP senders default to 98; historical score weighting  │
│ 3. Action Requirement        │ 20%          │ Approvals & complaints = 100; Informational FYI = 20   │
│ 4. Urgency & Stakes          │ 15%          │ Critical financial/professional risk = 100             │
│ 5. Interaction History       │ 10%          │ Repeat engagement frequency and reply density          │
└──────────────────────────────┴──────────────┴────────────────────────────────────────────────────────┘
```

#### Sensitivity Profiles:
- **Balanced (Default)**: Standard threshold cutoffs (Hotspot: $\ge 80$, Important: $60-79$, Normal: $30-59$, Low: $<30$).
- **Conservative**: Reduces false positives; only items with imminent deadlines and verified high stakes reach `hotspot`.
- **Aggressive**: Broadens `hotspot` inclusion for fast-moving workflows.

---

### 2.6 Task, Deadline & ATS Crawler Pipeline

1. **Task Extraction (`taskExtractor.ts`)**:
   - Converts actionable email items into first-class `Task` records linked via `sourceEmailId`.
   - Prevents artificial task creation for marketing, digests, and newsletters.
2. **Shortlink & Intermediate Link Bypass (`linkBypassService.ts`)**:
   - Follows intermediate redirectors (e.g., bit.ly, t.co, job aggregator landing pages) to locate the canonical employer Application Tracking System (Workday, Greenhouse, Lever, Google Careers, etc.).
3. **Deadline Web Crawler (`deadlineCrawlerService.ts`)**:
   - Crawls the canonical target page using Cheerio, scanning for DOM text matching "Application Deadline", "Last Date to Apply", or "Job Closed / No longer accepting applications".
   - Updates the task status to `isExpired` or `isClosed` if the position has elapsed.

---

### 2.7 Frontend & Sandboxed Gmail-Style Rendering Engine

- **Isolated HTML Renderer (`HtmlEmailViewer.tsx`)**:
  - Employs a sandboxed `<iframe>` with strict attributes:
    `sandbox="allow-popups allow-popups-to-escape-sandbox"`
  - **Security**: Script execution (`allow-scripts`) and origin inheritance (`allow-same-origin`) are disabled, ensuring malicious tracking scripts, crypto miners, or XSS vectors inside email bodies cannot access browser cookies, local storage, or application tokens.
  - **Dynamic Height Bounding Box**: Uses `MutationObserver` and `ResizeObserver` with a throttled bounding-rect calculation to eliminate scrollbar clipping and infinite height runaway loops.
- **Gmail-Inspired Workflow (`EmailDetailPage.tsx`)**:
  - Gmail navigation header (Back, Archive, Delete, Mark as Unread, Snooze).
  - Subject headline with inline priority badge and category tags.
  - Interactive "to me ▾" dropdown displaying authenticated sender address, recipient address, date, and security transport protocol.
  - Collapsible **AI Reasoning & Factor Score Breakdown** drawer.

---

## 3. Data Models & Schema Reference

The database is built on PostgreSQL via Prisma ORM (`prisma/schema.prisma`):

```prisma
model User {
  id           String         @id @default(cuid())
  email        String         @unique
  name         String?
  oauthTokens  String?        // JSON containing accessToken, refreshToken, expiresAt
  preferences  String?        // JSON configuration
  sensitivity  String         @default("balanced") // conservative | balanced | aggressive
  role         String         @default("user")     // admin | user
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  emails       Email[]
  tasks        Task[]
  senders      SenderProfile[]
  feedbacks    UserFeedback[]
}

model Email {
  id             String         @id @default(cuid())
  userId         String
  externalId     String?
  provider       String         @default("simulated") // gmail | outlook | simulated
  sender         String
  senderName     String?
  recipient      String
  subject        String
  bodySnippet    String
  bodyFull       String?        // Preserves full authentic HTML
  receivedAt     DateTime       @default(now())

  // AI Classification
  category       String         @default("other")
  intent         String         @default("other")
  urgency        String         @default("medium")
  requiresAction Boolean        @default(false)
  deadline       DateTime?
  actionSummary  String?

  // Priority Engine Output
  priorityScore  Float          @default(50.0)
  priorityTier   String         @default("normal") // hotspot | important | normal | low
  reasoning      String
  scoreBreakdown String?        // JSON factor scores

  status         String         @default("unread") // unread | read | archived | snoozed
  snoozedUntil   DateTime?
  snoozeReason   String?

  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks          Task[]
  feedbacks      UserFeedback[]

  @@index([userId, priorityTier])
  @@index([userId, status])
}

model Task {
  id            String    @id @default(cuid())
  userId        String
  sourceEmailId String?
  title         String
  description   String?
  deadline      DateTime?
  status        String    @default("todo") // todo | in_progress | done
  priority      String    @default("medium") // low | medium | high | critical
  reminderSent  Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  sourceEmail   Email?    @relation(fields: [sourceEmailId], references: [id], onDelete: SetNull)

  @@index([userId, status])
}

model SenderProfile {
  id                 String    @id @default(cuid())
  userId             String
  senderEmail        String
  senderName         String?
  importanceScore    Float     @default(50.0)
  isVip              Boolean   @default(false)
  interactionHistory String?
  totalEmails        Int       @default(1)
  lastInteractionAt  DateTime  @default(now())

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, senderEmail])
  @@index([userId, isVip])
}

model UserFeedback {
  id           String    @id @default(cuid())
  userId       String
  emailId      String?
  action       String    // thumbs_up | thumbs_down | manual_override
  overrideTier String?
  comments     String?
  createdAt    DateTime  @default(now())

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  email        Email?    @relation(fields: [emailId], references: [id], onDelete: Cascade)

  @@index([userId, emailId])
}
```

---

## 4. Legal & Regulatory Audit

### 4.1 Google API Services User Data Policy & CASA Verification

If MailRadar is deployed for public users who authenticate via Google OAuth:

1. **Restricted Scope Designation**:
   - `https://www.googleapis.com/auth/gmail.readonly` is classified by Google as a **Restricted Scope**.
2. **CASA Security Assessment Requirement**:
   - Google mandates that any non-internal application accessing restricted Gmail scopes must undergo an annual **Cloud Application Security Assessment (CASA) Tier 2 or Tier 3** verification conducted by an authorized third-party security lab (such as Bishop Fox, NCC Group, or Leviathan Security).
   - *Estimated Cost / Timeline*: Annual certification costs typically range from \$500 to \$3,000 depending on automated scanning vs. manual penetration test tiers.
3. **Prohibition on General AI Training**:
   - Google's Limited Use Requirements explicitly forbid using user email data obtained via OAuth APIs to train, retrain, or fine-tune generalized AI/ML models without explicit, affirmative user opt-in and isolated governance.
   - *MailRadar Compliance*: MailRadar uses prompts for inference-only without storing prompt-completion pairs into a fine-tuning dataset, which satisfies this requirement.
4. **Human Review Restrictions**:
   - Employees/engineers cannot read user emails unless explicit user consent is granted for debugging specific messages, or if required for security investigation or legal subpoena.

---

### 4.2 Privacy Laws: GDPR, CCPA/CPRA, and India DPDP Act 2023

Emails frequently contain sensitive personal data (Personally Identifiable Information - PII), including financial receipts, health notices, personal contacts, and legal notices.

```
┌──────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Statutory Requirement                        │ MailRadar Implementation / Obligation                  │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Right to Erasure / Deletion (GDPR Art. 17)    │ Must provide a one-click "Delete My Data" feature that │
│                                              │ executes cascading deletes on User and related tables. │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ Data Minimization (GDPR Art. 5)              │ Store only necessary metadata; provide configurable    │
│                                              │ retention policies (e.g. auto-purge after 90 days).    │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ India Digital Personal Data Protection (DPDP)│ Mandates clear notice and explicit consent before data │
│ Act 2023                                     │ processing; requires technical safeguards against PII. │
├──────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ CCPA "Do Not Sell or Share My Info"          │ MailRadar does not monetize or broker user data to 3rd │
│                                              │ party data brokers or ad networks.                     │
└──────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

### 4.3 Third-Party AI Data Transfer & Retention (Anthropic Claude API)

- **Data in Transit**: Email subject, sender, and snippet/body are transmitted over TLS 1.3 to Anthropic’s API endpoints (`api.anthropic.com`).
- **Data Retention by LLM Vendor**: Under Anthropic’s Commercial API Terms of Service, user prompt data submitted via the commercial API is **not used for model training** and is retained for a maximum of 30 days solely for trust and safety monitoring before automated deletion.
- **Contractual Obligation**: Production deployment requires executing a **Data Processing Addendum (DPA)** with Anthropic covering standard contractual clauses (SCCs) for cross-border data transfer.

---

### 4.4 Telegram Scraping & External Crawling Legality

1. **Telegram Web Preview Scraping (`telegramScraperService.ts`)**:
   - The current service scrapes `https://t.me/s/<channel>`.
   - While public channel previews are open to indexation, high-volume automated requests violate Telegram’s Terms of Service for web crawlers and can trigger IP blocks or Cloudflare CAPTCHAs.
   - *Recommended Production Fix*: Migrate to the official **Telegram Bot API** or **Telegram MTProto Client API** using authorized application credentials (`api_id` and `api_hash`).
2. **ATS Portal & Career Link Crawling (`deadlineCrawlerService.ts`)**:
   - Crawling publicly accessible job portals to determine application deadlines is protected under US judicial precedent (*hiQ Labs v. LinkedIn* regarding public web data).
   - *Best Practice*: Honor `robots.txt`, implement exponential backoff on HTTP 429 responses, and maintain polite concurrency limits.

---

### 4.5 Intellectual Property, Trademarks & Brand Fair Use

- **Gmail / Google Trademark Usage**:
  - The UI and codebase reference "Gmail view" or "Gmail toolbar".
  - *Requirement*: If launched commercially, the platform must clearly display the standard third-party compatibility disclaimer:
  > *"MailRadar is an independent email productivity platform and is not affiliated with, endorsed by, or sponsored by Google LLC, Gmail, or Microsoft Corporation."*

---

## 5. Cybersecurity & Vulnerability Assessment

### 5.1 Threat Matrix & Risk Ratings

```
┌──────────────────────────────────────────────┬──────────────┬────────────────────────────────────────────────────────┐
│ Vulnerability / Threat Area                  │ Risk Level   │ Status & Remediation Strategy                          │
├──────────────────────────────────────────────┼──────────────┼────────────────────────────────────────────────────────┤
│ 1. Plaintext OAuth Tokens in Database        │ 🔴 HIGH      │ Store tokens encrypted at rest via AES-256-GCM.        │
│ 2. Server-Side Request Forgery (SSRF)        │ 🟠 MEDIUM    │ Block private IP ranges (127.0.0.1, 169.254.*) in HTTP │
│ 3. Stored XSS via Malicious Email HTML       │ 🟢 MITIGATED │ Handled via sandboxed iframe without allow-scripts.    │
│ 4. CSRF on State-Changing API Endpoints      │ 🟢 MITIGATED │ Protected via Double-Submit Cookie CSRF middleware.    │
│ 5. API Rate Limiting & DoS Protection        │ 🟢 MITIGATED │ Protected via express-rate-limit sliding windows.      │
│ 6. Memory Leak on Single-Process Queue       │ 🟡 MODERATE  │ Mandate Redis BullMQ in multi-instance production.     │
└──────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

### 5.2 Detailed Vulnerability Analysis & Remediation

#### 1. OAuth Tokens & Password Encryption at Rest (High Priority)
- **Current Finding**: In `User.oauthTokens` and `User.preferences`, Google OAuth refresh tokens and IMAP passwords are saved as plaintext JSON strings in PostgreSQL.
- **Risk**: If a database backup is leaked or read access is compromised, attackers could access user mailboxes.
- **Remediation**:
  Implement an envelope encryption utility using `crypto.createCipheriv('aes-256-gcm', key, iv)`:
  ```typescript
  import crypto from 'crypto';
  const ENCRYPTION_KEY = Buffer.from(process.env.DB_ENCRYPTION_KEY!, 'hex'); // 32 bytes

  export function encryptToken(plainText: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }
  ```

#### 2. Server-Side Request Forgery (SSRF) in Link Bypasser / Deadline Crawler (Medium Priority)
- **Current Finding**: `deadlineCrawlerService.ts` and `linkBypassService.ts` fetch URLs found inside email bodies.
- **Risk**: A malicious email could contain links to AWS EC2 metadata (`http://169.254.169.254/latest/meta-data/`) or internal network services (`http://localhost:5432`).
- **Remediation**: Validate destination hostnames and reject private RFC-1918 IPv4 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`, `::1`).

#### 3. Cross-Site Scripting (XSS) in Email Content Rendering (Mitigated)
- **Current Finding**: `HtmlEmailViewer.tsx` embeds authentic email HTML inside an `<iframe>`.
- **Mitigation in Place**: The iframe enforces `sandbox="allow-popups allow-popups-to-escape-sandbox"` without `allow-scripts` or `allow-same-origin`. This guarantees that even if an email body contains malicious `<script>` tags, event listeners, or `document.cookie` stealers, the browser engine executes nothing and isolates the DOM completely from the parent app.

#### 4. Cross-Site Request Forgery (CSRF) Protection (Mitigated)
- **Current Finding**: `csrfMiddleware.ts` enforces modern Double-Submit Cookie verification on all state-changing HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## 6. Production Launch Checklist

Before deploying MailRadar to a public domain for general consumer or enterprise availability:

### Infrastructure & Security
- [ ] Provision a managed Redis cluster (Upstash / AWS ElastiCache) and set `REDIS_HOST` in `.env`.
- [ ] Configure `DB_ENCRYPTION_KEY` and encrypt all OAuth refresh tokens in PostgreSQL.
- [ ] Add SSRF validation filter to `deadlineCrawlerService.ts`.
- [ ] Enable TLS/SSL certificates (HTTPS) and set `secure: true` on all session and CSRF cookies.

### Legal, Policy & Compliance
- [ ] Publish a public **Privacy Policy** and **Terms of Service** detailing email data retention periods.
- [ ] Add a prominent "Delete Account & Purge All Ingested Data" endpoint fulfilling GDPR Article 17 / DPDP Section 12.
- [ ] Execute a Data Processing Addendum (DPA) with Anthropic.
- [ ] Submit the application to Google Cloud Console for OAuth Verification and complete the CASA Tier 2 security review.
- [ ] Add the third-party brand disclaimer regarding Google/Gmail trademarks in the application footer.
