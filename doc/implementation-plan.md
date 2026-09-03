# Phase-Wise Implementation Plan: Jarvis (7-Agent Autonomous Digest)

This document breaks down the architecture and problem statement into a structured, phase-by-phase implementation plan.

## Phase 1: Project Setup & Core Infrastructure
**Goal:** Initialize the repository, define core data models, and set up configuration management.
- [x] **1.1 Project Initialization:** Set up the project repository (Node.js with TypeScript). Set up linting and formatting.
- [x] **1.2 Configuration Management:** 
    - [x] Set up `.env` for local API keys (Product Hunt, Gemini Worker Keys, Gemini Supervisor Key, Resend).
- [x] **1.3 Core Data Models:** Define standard data schemas/types for:
    - [x] `RawItem` (from fetchers)
    - [x] `FilteredItem` (passed quality gates)
    - [x] `ProcessedItem` (LLM summarized and tagged)
- [x] **1.4 State Store Setup:** Implement a lightweight local JSON reader and writer to track previously sent items.

## Phase 2: Data Ingestion Layer (Fetchers)
**Goal:** Successfully pull raw data from all verified sources.
- [x] **2.1 Standard RSS Fetcher:** Implement generic RSS parsing for Lenny's Newsletter, Ben's Bites, TechCrunch AI, Crunchbase News, Inc42, Entrackr, Aakash Gupta, OpenAI, and DeepMind.
- [x] **2.2 Product Hunt Fetcher:** Implement GraphQL query to fetch top products from the last 24 hours.
- [x] **2.3 Hacker News Fetcher:** 
    - [x] Implement Algolia API call for "story" items matching PM/AI keywords.
    - [x] Implement the URL HTML fetcher to extract `og:description` or `<meta name="description">` as a fallback summary.
- [x] **2.4 Anthropic Fetcher:** Implement primary RSSHub fetching with automated fallback to a GitHub pages mirror.
- [x] **2.5 The Rundown AI Custom Parser:** Implement HTML parsing of the RSS `<content:encoded>` field to extract individual story blocks (ignoring ads/sponsors).

## Phase 3: Processing & Filtering Layer
**Goal:** Clean the data, apply quality thresholds, and remove duplicates.
- [x] **3.1 Quality Gates:** Implement threshold checks per source type (e.g. PH >= 50 upvotes).
- [x] **3.2 Intra-Day Deduplication:** Merge similar stories fetched on the same day from different sources.
- [x] **3.3 Inter-Day Deduplication:** Filter out items that exist in the local state store.

## Phase 4: 7-Agent Autonomous Architecture
**Goal:** Build the Supervisor-Worker hierarchy to manage Gemini instances dynamically.
- [x] **4.1 Base Worker Agent (`worker.ts`):** Implement the isolated Gemini caller.
- [x] **4.2 Base Supervisor Agent (`supervisor.ts`):** Implement the strategy toolbox, LLM-based error analysis, and the `executeWithToolbox` catch block.
- [x] **4.3 Strategy Memory (`memory.ts`):** Implement persistent logging of chosen strategies so the system learns from daily runs.
- [x] **4.4 Dynamic Upgrades:** Implement `swap_to_smarter_model` so workers can step up from `flash` to `pro` models when hitting `MALFORMED_JSON` errors.
- [x] **4.5 Curation (Supervisor A):** Delegate ingestion and filtering to Supervisor A.
- [x] **4.6 Content (Supervisor B):** Delegate summarization, tagging, and formatting to Supervisor B.

## Phase 5: Self-Healing Developer Agent
**Goal:** Prevent catastrophic failure by allowing the AI to write its own bug fixes.
- [x] **5.1 Escalate to Developer Strategy:** Add an escalation path in `SupervisorAgent` for unknown errors.
- [x] **5.2 Developer Agent Logic (`developer.ts`):** Implement the agent that reads `supervisor.ts`, generates a new TypeScript code patch, and injects it.
- [x] **5.3 Syntax Verification:** Automatically run `npx tsc` on the generated code. Roll back if compilation fails.
- [x] **5.4 GitHub & Restart:** On success, automatically push the fix to GitHub and crash the process (`process.exit(1)`) so the server restarts with the new code.

## Phase 6: Delivery & Automation
**Goal:** Format the processed items, send the email, and schedule continuous execution.
- [x] **6.1 Email Templating:** Create an HTML template that highlights PM relevance tags and explicitly displays the original source.
- [x] **6.2 Resend Integration:** Integrate the Resend SDK to dispatch the email and add webhooks for bounce tracking.
- [x] **6.3 Express Server & Cron:** Wrap the workflow in an Express server and schedule it with `node-cron` at 09:00 AM IST.
- [x] **6.4 SOS Webhook:** Implement an alert system for unrecoverable crashes.
- [x] **6.5 Deployment:** Deploy the continuous server to Railway.
