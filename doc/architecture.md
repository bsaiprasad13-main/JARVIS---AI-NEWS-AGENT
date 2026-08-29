# Architecture: Jarvis (PM-Focused AI Tools & News Digest System)

This document outlines the architecture for the automated daily digest system designed to discover, filter, verify, and summarize PM-relevant AI tools and news.

## 1. High-Level System Overview

The system is a scheduled batch-processing pipeline that runs daily. It ingests data from various free sources (RSS, APIs, HTML), filters out noise based on predefined quality thresholds, deduplicates items, leverages LLMs (Groq and Gemini) for summarization and tagging, and finally dispatches a consolidated email digest.

## 2. Core Components

### 2.1 Data Ingestion Layer (Fetchers)
Responsible for pulling content from external sources. It handles different data structures:
*   **Standard RSS Fetchers:** For Lenny's Newsletter, Ben's Bites, TechCrunch AI, Crunchbase News, Inc42, Entrackr, Aakash Gupta.
*   **Sources:** 10 verified sources including standard RSS feeds, Product Hunt GraphQL, Hacker News REST API, and custom HTML scraping.
*   **Resiliency:** Features an HTML Auto-Discovery fallback for RSS feeds that return 404s, ensuring links that change domains or paths are automatically found and parsed.
*   **Tasks Performed:** Fetch raw data, normalize into the `RawItem` schema. Rundown AI (where multiple stories are bundled in a single HTML payload).
*   **Enrichment:** Specifically for Hacker News, where descriptions are missing, a sub-module fetches the linked page's HTML to extract `og:description` or `meta name="description"`.

### 2.2 Processing & Filtering Layer
*   **Quality Gate:** Applies source-specific thresholds to ensure only high-traction items proceed.
    *   Product Hunt: >= 50 upvotes in 24h.
    *   Hacker News: >= 30 points OR >= 15 comments.
    *   Newsletters/News sites: Auto-pass (curation is considered pre-verification).
*   **Deduplication Engine:**
    *   *Intra-day:* Merges duplicate stories/tools from different sources on the same day, keeping the most reliable source.
    *   *Inter-day:* Checks a lightweight state store (e.g., flat JSON or CSV file) to prevent sending items that have been included in previous digests.

### 2.3 AI Processing Layer (Dual-Provider Router)
This is the core intelligence of the system, responsible for summarization and tagging.
*   **Capacity-Aware Router:** Dynamically distributes workloads between Groq (`openai/gpt-oss-20b`) and Google Gemini (`gemini-3-flash-preview`).
*   **Token & Rate Management:** Tracks RPM, TPM, RPD, and TPD using a sliding window and reserves tokens before dispatching requests. Applies an 80% safety margin.
*   **Smart Chunking:** If a payload exceeds the provider's context limit, it intelligently splits the text at semantic boundaries (documents -> paragraphs -> sentences -> words).
*   **Failover & Backoff:** Handles HTTP 429 errors with exponential backoff and automatically fails over to the healthy provider if one is exhausted or down.
*   **Tasks Performed:** Generates a one-line summary and a one-line explanation of PM relevance, mapping to predefined PM skill tags.

### 2.4 Delivery Layer
*   **Email Composer:** Assembles the processed items into a clean, categorized HTML email format, ensuring each item explicitly displays its original source.
*   **Dispatcher:** Uses the Resend API to send the compiled digest to the target inbox.

## 3. Data Flow

1.  **Trigger:** GitHub Actions cron job fires daily.
2.  **Ingestion:** Fetchers pull data from the 10 defined sources.
3.  **Filtration:** Raw items pass through the Quality Gate. Low-traction items are discarded.
4.  **Enrichment:** Items lacking descriptions (e.g., HN) fetch metadata from their target URLs.
5.  **Deduplication:** The deduplication engine cleans the list against today's items and historical state.
6.  **AI Processing:** The list is sent to the AI Router. The Router manages LLM calls to Groq/Gemini to get summaries and tags.
7.  **Formatting:** The processed data is formatted into an email template.
8.  **Delivery:** The email is sent via Resend.
9.  **State Update:** The lightweight state store is updated with today's sent items.

## 4. Infrastructure & Deployment

*   **Compute & Scheduling:** GitHub Actions (cron trigger) serves as the primary runner for the daily batch job. Railway can be used for any persistent needs if the architecture evolves.
*   **State Management:** Lightweight file-based store (e.g., a JSON file). To persist across GitHub Actions runs, this can be committed back to the repository or stored in a simple cloud bucket. No dedicated relational database to keep the system simple and maintainable.
*   **Language/Runtime:** (To be decided, e.g., Python or Node.js).

## 5. Configuration & Security

*   **Config Files:** Model names, context limits, and rate limits are stored in `models.yaml`, entirely separate from the codebase logic.
*   **Secret Management:** API keys (Product Hunt, Groq, Gemini, Resend) are stored in `.env` for local dev and GitHub Actions/Railway environment variables for production. *Keys are never hardcoded or committed to version control.*
