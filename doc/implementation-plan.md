# Phase-Wise Implementation Plan: Jarvis (PM-Focused AI Tools & News Digest)

This document breaks down the architecture and problem statement into a structured, phase-by-phase implementation plan.

## Phase 1: Project Setup & Core Infrastructure
**Goal:** Initialize the repository, define core data models, and set up configuration management.
- [x] **1.1 Project Initialization:** Set up the project repository (e.g., Node.js with TypeScript or Python). Set up linting and formatting.
- [x] **1.2 Configuration Management:** 
    - [x] Create `models.yaml` to store LLM configuration (context limits, safety margins).
    - [x] Set up `.env` for local API keys (Product Hunt, Groq, Gemini, Resend).
- [x] **1.3 Core Data Models:** Define standard data schemas/types for:
    - [x] `RawItem` (from fetchers)
    - [x] `FilteredItem` (passed quality gates)
    - [x] `ProcessedItem` (LLM summarized and tagged)
- [x] **1.4 State Store Setup:** Implement a lightweight local JSON/CSV reader and writer to track previously sent items.

## Phase 2: Data Ingestion Layer (Fetchers)
**Goal:** Successfully pull raw data from all 10 verified sources.
- [x] **2.1 Standard RSS Fetcher:** Implement generic RSS parsing for Lenny's Newsletter, Ben's Bites, TechCrunch AI, Crunchbase News, Inc42, Entrackr, and Aakash Gupta.
- [x] **2.2 Product Hunt Fetcher:** Implement GraphQL query to fetch top products from the last 24 hours.
- [x] **2.3 Hacker News Fetcher:** 
    - [x] Implement Algolia API call for "story" items matching PM/AI keywords.
    - [x] Implement the URL HTML fetcher to extract `og:description` or `<meta name="description">` as a fallback summary.
- [x] **2.4 The Rundown AI Custom Parser:** Implement HTML parsing of the RSS `<content:encoded>` field to extract individual story blocks (ignoring ads/sponsors).

## Phase 3: Processing & Filtering Layer
**Goal:** Clean the data, apply quality thresholds, and remove duplicates.
- [ ] **3.1 Quality Gates:** Implement threshold checks per source type:
    - [ ] Product Hunt: >= 50 upvotes.
    - [ ] Hacker News: >= 30 points OR >= 15 comments.
    - [ ] Newsletters/Outlets: Auto-pass.
- [ ] **3.2 Intra-Day Deduplication:** Merge similar stories/tools fetched on the same day from different sources.
- [ ] **3.3 Inter-Day Deduplication:** Filter out items that exist in the local state store (already sent in a previous digest).

## Phase 4: AI Dual-Provider Router & Processing
**Goal:** Build the capacity-aware LLM router and process items for summaries and tags.
- [ ] **4.1 Base Provider & Adapters:** Implement the `LLMProvider` interface and create adapters for `Groq` and `Gemini`.
- [ ] **4.2 Token & Rate Manager:** Implement the sliding window logic for RPM, TPM, RPD, and TPD. Add the 80% safety margin calculation.
- [ ] **4.3 Router Core:** Implement dispatch logic, exponential backoff for 429s, and automatic failover between Groq and Gemini.
- [ ] **4.4 Smart Chunking:** Implement semantic text splitting (doc -> paragraph -> sentence -> word) for payloads exceeding context limits.
- [ ] **4.5 Prompt Engineering:** Define the prompts for:
    - [ ] Generating a one-line summary.
    - [ ] Generating a one-line explanation of PM relevance.
    - [ ] Categorizing into the predefined Personalization Tags.
- [ ] **4.6 Processing Pipeline:** Pass the deduplicated items through the Router to get their final summaries and tags.

## Phase 5: Delivery Layer
**Goal:** Format the processed items into a clean email and send it.
- [ ] **5.1 Email Templating:** Create an HTML template (and plain-text fallback) that categorizes items by category, highlights their PM relevance tags, and explicitly displays the original source for each item.
- [ ] **5.2 Resend Integration:** Integrate the Resend SDK/API to dispatch the email.
- [ ] **5.3 State Update:** Implement logic to write the IDs/URLs of successfully sent items back to the local state store JSON file to prevent future duplicates.

## Phase 6: Automation & Deployment
**Goal:** Automate the daily run without manual intervention.
- [ ] **6.1 Local End-to-End Testing:** Run the full pipeline locally to verify data flow from fetch to email dispatch.
- [ ] **6.2 GitHub Actions Setup:** Create a `.github/workflows/daily-digest.yml` file with a cron schedule.
- [ ] **6.3 Secrets Configuration:** Add the necessary `.env` variables to GitHub Repository Secrets.
- [ ] **6.4 Monitoring & Logs:** Ensure adequate `console.log` statements exist for debugging fetch failures, LLM failovers, and email dispatch status without requiring dedicated telemetry software.
