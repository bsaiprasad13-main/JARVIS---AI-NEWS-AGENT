# Architecture: Jarvis (7-Agent Autonomous System)

This document outlines the architecture for the automated daily digest system designed to discover, filter, verify, and summarize PM-relevant AI tools and news.

## 1. High-Level System Overview

The system is a continuous Express server scheduled via `node-cron`. It ingests data from various free sources, filters out noise, deduplicates items, and leverages a **7-Agent Supervisor Architecture** powered by Google Gemini to curate, summarize, format, and deliver an HTML email digest. The architecture is deeply fault-tolerant, featuring self-healing code generation and dynamic memory persistence.

## 2. Core Components

### 2.1 The 7-Agent Supervisor Architecture
The system completely replaces linear scripting with an intelligent Agent hierarchy.
*   **Supervisor A (Curation)**: Manages Worker 1 and Worker 2. Responsible for parsing raw JSON streams, filtering irrelevant data, and deduplicating items across sources.
*   **Supervisor B (Content & Delivery)**: Manages Worker 3 and Worker 4. Responsible for writing the final HTML payload and initiating the Resend email dispatch.
*   **Workers 1-4 (Execution)**: Specialized Gemini AI instances, each running on a completely isolated API Key.
*   **Safe-Side Agent (Fallback / Developer)**: An isolated Agent running on a highly-restricted reserve API key. Used as a final fallback for operations or as a "Developer" to write code patches.

### 2.2 Dynamic Failsafe Strategies & Strategy Memory
When a Worker fails (e.g. 429 quota exhaustion, 503 outage, MALFORMED_JSON), the managing Supervisor catches the error and consults its LLM brain to pick a recovery strategy:
*   **`retry_immediately`**: For transient network errors.
*   **`swap_to_safe_side`**: Instantly hot-swaps the failing Worker's API key with the Safe-Side agent's API key to bypass rate limits.
*   **`swap_to_smarter_model`**: Dynamically steps the Worker up the model hierarchy (e.g., from `gemini-1.5-flash` to `gemini-1.5-pro` to `gemini-1.0-pro`) if the output quality is poor.
*   **Strategy Memory**: All chosen strategies are persisted to `data/supervisor_memory.json`. Supervisors load this file on boot so they don't repeat the same mistakes tomorrow.

### 2.3 Self-Healing Code Generation (Developer Agent)
If a completely novel, unhandled error occurs, the Supervisor triggers the `escalate_to_developer` strategy.
1. The Safe-Side agent wakes up in "Developer Mode".
2. It physically loads `src/agents/supervisor.ts` into memory.
3. It writes a raw TypeScript `else if` block to handle the new error.
4. It injects the code into the file, verifies syntax with `tsc`, pushes to GitHub, and kills the Node process to force Railway to restart with the new code.

### 2.4 Data Ingestion Layer (Fetchers)
Responsible for pulling content from external sources.
*   **Standard RSS Fetchers:** Lenny's Newsletter, Ben's Bites, TechCrunch AI, Crunchbase News, Inc42, Entrackr, Aakash Gupta, OpenAI Blog, Google DeepMind.
*   **Custom Fetchers:** Anthropic Blog, Product Hunt, Hacker News, The Rundown AI.
*   **Enrichment:** Specific fallback fetching for Hacker News metadata.

## 3. Data Flow

1.  **Trigger:** `node-cron` fires at 09:00 AM IST on the Railway server.
2.  **Ingestion:** Fetchers pull data from the 12+ defined sources.
3.  **Filtration:** Raw items pass through the Quality Gate.
4.  **Curation (Supervisor A):** Cleans, deduplicates, and formats data into a highly curated list.
5.  **Summarization (Supervisor B):** Generates PM-focused summaries and dynamic tags.
6.  **Formatting & Delivery (Supervisor B):** Compiles the HTML email template and dispatches via Resend API.
7.  **State Update:** The lightweight state store (`sent_items.json`) is updated with today's sent items to ensure cross-day deduplication.

## 4. Infrastructure & Deployment

*   **Compute & Scheduling:** A persistent Node.js Express server deployed on **Railway**. The cron job is managed internally via `node-cron`.
*   **State Management:** Lightweight file-based JSON stores (`sent_items.json`, `supervisor_memory.json`).
*   **Language/Runtime:** TypeScript / Node.js.

## 5. Configuration & Security

*   **Secret Management:** Multi-key setup (Worker keys, Supervisor key, Safe-Side key, Resend key) are provided as Environment Variables in Railway. *Keys are never hardcoded or committed to version control.*
