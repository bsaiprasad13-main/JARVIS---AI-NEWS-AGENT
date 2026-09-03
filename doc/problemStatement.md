# Problem Statement: Jarvis (PM-Focused AI Tools & News Digest System)

## 1. Background

As a product management aspirant preparing for PM/APM placements (targeting companies like Flipkart, Meesho, Razorpay, and Adobe), staying current with emerging AI tools and industry developments relevant to product management is valuable — both for on-the-job effectiveness and for demonstrating market awareness in interviews. However, AI tool launches and news are high-volume and scattered across many sources, making manual tracking inefficient and inconsistent.

## 2. Problem Statement

**Build an automated daily digest system that discovers, filters, verifies, and summarizes new AI tools, productivity tools, and industry news relevant to product management work, and delivers them as a concise email — without requiring manual monitoring of multiple sources.**

The system should surface only high-signal, verifiable items (not hype or unverified launches), tag each item by the specific PM skill area it supports, and explain in one line why it's worth the reader's attention — enabling consistent, low-effort exposure to tools and trends that matter for a PM's day-to-day work and career growth, without inbox fatigue.

## 3. Objectives

- Stay consistently informed about new AI/productivity tools and industry developments relevant to PM work, with minimal manual effort.
- Reduce noise by filtering for verified, high-traction items only.
- Understand *why* each item matters, mapped to concrete PM skill areas — not generic praise.
- Avoid duplicate or repeated content, both within a single day and across days.
- Keep the system lightweight, low-cost, and maintainable by a solo builder new to production systems.

## 4. Scope

### 4.1 Content Categories (in scope)
1. **PM-specific tools** — tools that directly support PM craft (see tag list below)
2. **General corporate/productivity tools** — useful to any knowledge worker
3. **Funding/company news** — new startups or funding rounds, especially those building for PMs or relevant to target companies (India-inclusive)
4. **General AI industry news** — research and trend developments

### 4.2 Personalization Tags
Every item must be tagged with the specific area(s) it supports:

- User research
- Roadmapping / prioritization
- PRD / spec writing
- Product analytics
- Competitive intel
- Stakeholder comms / presentations
- Experimentation / A-B testing
- Growth / GTM & pricing-monetization
- Customer feedback / voice-of-customer synthesis
- No-code / prototyping
- General productivity (meetings, docs, scheduling)
- AI agents / automation
- Product case-study / interview prep tools

### 4.3 Out of Scope (v1)
- Dedicated web dashboard or app UI (email is the sole interface)
- Persistent "save/bookmark" feature (handled via email labels/stars instead)
- Learning/feedback loop that adapts filtering based on user engagement (fixed tag list for v1)
- Paid APIs or data sources
- Real-time/instant alerts (daily cadence only)

## 5. Functional Requirements

### 5.1 Data Collection
- Fetch content daily from the following free sources:
  - **PM tools:** Product Hunt API, Lenny's Newsletter (RSS), Aakash Gupta's Product Growth newsletter (RSS)
  - **General productivity tools:** Product Hunt (broader tags), Ben's Bites (RSS)
  - **Funding/company news:** TechCrunch AI (RSS), Crunchbase News (RSS), Entrackr, Inc42
  - **AI industry news:** Ben's Bites, The Rundown AI, Hacker News (Algolia API)
- Only consider items published in the **last 24–48 hours**.

### 5.2 Verification / Quality Bar
An item qualifies for inclusion only if it shows real traction:
- Product Hunt: upvote count above a defined threshold
- Hacker News: points/comments above a defined threshold
- Newsletter-sourced items: inclusion in a curated newsletter counts as pre-verification

### 5.3 Deduplication
- **Within a day:** if multiple sources cover the same tool/news item, merge into a single entry using the best-verified source.
- **Across days:** maintain a lightweight state log (flat file or spreadsheet) of previously sent items to avoid repeats.

### 5.4 Summarization
- Summarization and data analysis will be powered exclusively by **Google Gemini**, orchestrated through a **7-Agent Autonomous Architecture**.
- The system must generate, per item:
  - One-line summary of the tool/news
  - One-line explanation of why it's relevant to the reader's PM work, referencing the mapped tag(s)
- Workload distribution, rate limit management, and error handling are dynamically managed by Supervisor Agents (see **Section 6** for detailed architecture).

### 5.5 Volume Control
- No fixed item count. Ceiling of ~8–10 items per day; no minimum — only items clearing the quality bar are included, even if that means fewer than 8 on a given day.

### 5.6 Delivery
- Send one daily email containing all qualifying items categorized by category, each tagged by PM skill area, and explicitly displaying its original source.

## 6. 7-Agent Autonomous Supervisor Architecture

### 6.1 Core Objective
The system completely replaces linear scripting with an intelligent Agent hierarchy to guarantee reliability. It dynamically distributes LLM workloads across multiple isolated API keys. If a worker fails, a Supervisor agent dynamically assesses the error and picks a recovery strategy to ensure the workflow never drops data.

### 6.2 The Agent Roles
- **Supervisor A (Curation):** Manages data ingestion, filtering, and deduplication.
- **Supervisor B (Content & Delivery):** Manages HTML formatting and dispatch.
- **Workers 1-4 (Execution):** Specialized Gemini instances running on isolated API keys to distribute load and evade rate limits.
- **Safe-Side Agent (Developer):** A highly restricted agent. If a catastrophic error occurs, this agent writes a TypeScript patch into the source code, compiles it, pushes it to GitHub, and restarts the server to heal the system.

### 6.3 Dynamic Failsafe Strategies & Memory
- **Strategy Toolbox:** Supervisors can pick strategies like `retry_immediately` (transient errors), `swap_to_safe_side` (429 quota exhaustion), or `swap_to_smarter_model` (poor quality / malformed JSON).
- **Persistent Memory:** Supervisors record their chosen strategies to `data/supervisor_memory.json` to "learn" how to handle errors across daily runs.
- **Model Upgrades:** If a fast model (`gemini-1.5-flash`) fails to reason through complex data, the Supervisor dynamically upgrades the worker to `gemini-1.5-pro` or `gemini-1.0-pro` for that specific chunk.

### 6.4 Configuration & Security
- **Secret Management:** API keys must never be hard-coded. They are exclusively managed via environment variables (`.env` locally, Railway variables in production).

## 7. Non-Functional Requirements

- **Hosting:** Railway (Persistent Express Node.js Server).
- **Scheduling:** `node-cron` running continuously on the Express server, triggering at 09:00 AM IST.
- **Cost:** Free-tier sources and multiple free-tier Gemini API keys.
- **Reliability:** The 7-Agent architecture handles self-healing. If an unrecoverable failure occurs, a `sendSOSAlert` webhook immediately notifies the admin.
- **Maintainability:** Solo-buildable; uses a lightweight file-based state store for dedup (`sent_items.json`) and memory (`supervisor_memory.json`).
- **Secret Management:** API keys (Product Hunt, multiple Gemini keys, Resend) will be stored in a `.env` file for local development and managed via Railway environment variables in production.
- **Testing:** The full pipeline will be tested locally before deployment to GitHub Actions and Railway.

## 8. Success Criteria

- The system reliably sends a daily digest without manual intervention.
- The reader (Sai) stays consistently exposed to new, relevant PM/productivity tools and industry news he wouldn't have otherwise discovered.
- Digest content is trustworthy enough to reference in professional contexts (e.g., interviews) without independent fact-checking.
- Digest remains readable and non-overwhelming (no inbox fatigue from irrelevant or excessive content).

## 9. Future Considerations (explicitly deferred, not v1)
- Adaptive personalization based on what the reader engages with (opens, clicks) over time
- Expanding to a dashboard/app if email alone proves insufficient
- Adding paid data sources if free sources prove insufficient in coverage or verification depth

## 10. Appendix: Verified Implementation Details

### 10.1 Verified Source Endpoints (confirmed working as of Aug 29, 2026)
All 10 sources have been manually verified as reachable and returning current (same-day/recent) data. Reddit was evaluated but dropped — see note below.

| # | Source | Endpoint | Auth needed |
|---|---|---|---|
| 1 | Lenny's Newsletter | `https://www.lennysnewsletter.com/feed` | None |
| 2 | Ben's Bites | `https://www.bensbites.com/feed` | None |
| 3 | Entrackr | `https://entrackr.com/rss` | None |
| 4 | Aakash Gupta's Product Growth | `https://news.aakashg.com/feed` | None |
| 5 | TechCrunch AI | `https://techcrunch.com/category/artificial-intelligence/feed/` | None |
| 6 | Crunchbase News | `https://news.crunchbase.com/feed/` | None |
| 7 | Inc42 | `https://inc42.com/feed/` | None |
| 8 | Product Hunt | `https://api.producthunt.com/v2/api/graphql` | Free developer API token |
| 9 | Hacker News (Algolia) | `https://hn.algolia.com/api/v1/search_by_date?tags=story` | None |
| 10 | The Rundown AI | `https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml` | None — **special handling required**, see 9.3 below |

**Dropped: Reddit (r/ProductManagement).** As of 2026, Reddit closed self-service API app creation — creating a new app now requires submitting a request and waiting for manual approval, with near-zero approval rates for non-moderator/non-commercial use cases. Given the multi-week uncertain wait and Reddit's role as a "nice to have" (real practitioner chatter, not a core content pillar), it was dropped rather than blocking the rest of the build on an approval process outside the builder's control.

### 10.2 Per-Source Structural Assumptions (fetch/parsing behavior)

| Source | One item = one story? | Description field | Engagement signal | Noise level | Parser type |
|---|---|---|---|---|---|
| Lenny's Newsletter | ✅ Yes | `<description>` | None | Low — but podcast episodes mixed with written posts; filter items with minimal description if only written posts wanted | Standard RSS |
| Ben's Bites | ✅ Yes | `<description>` | None | Low | Standard RSS |
| Entrackr | ✅ Yes | `<description>` | None | **High** — feed includes ALL content (funding, earnings, executive moves, non-tech categories); requires keyword/category filter | Standard RSS + filter layer |
| Aakash Gupta's Product Growth | ✅ Yes | `<description>` | None | Moderate — sponsor/ad blocks embedded in `<content:encoded>`; use only `<title>`/`<description>`, skip `<content:encoded>` | Standard RSS |
| TechCrunch AI | ✅ Yes | `description` | None | Low/moderate | Standard RSS |
| Crunchbase News | ✅ Yes | `description` | None | Moderate | Standard RSS |
| Inc42 | ✅ Yes | `description` | None | Moderate | Standard RSS |
| Product Hunt | ✅ Yes | `description` / `tagline` | `votesCount` | Low | **Custom GraphQL** |
| Hacker News | ✅ Yes | ❌ None — title only | `points`, `num_comments` | **High** — general firehose, not topic-filtered; must query with specific keywords (e.g., "AI agent," "product management") rather than pulling all stories and filtering after | **Custom JSON** |
| The Rundown AI | ❌ **No** — one item = full day's edition; individual stories bundled inside `<content:encoded>` HTML alongside ads/sponsors | None at item level; must parse `<content:encoded>` HTML | None | High if unparsed | **Custom HTML parser** — see 9.3 |

### 10.3 Special Case: The Rundown AI Feed Structure
Each `<item>`'s `<content:encoded>` field contains one full day's newsletter as raw HTML — multiple distinct story sections (each typically marked by an `<h4>` heading with the story title), interleaved with sponsor/ad blocks, a "Trending AI Tools" list, and a "Quick Hits" roundup of shorter items.

**Required handling:** a dedicated parser for this source that:
1. Takes the `<content:encoded>` HTML for a given day's item
2. Splits it into individual story blocks (e.g., by locating `<h4>` heading elements that mark each story)
3. Extracts each story's title, a short body excerpt (the paragraph(s) following the heading), and its outbound link
4. Filters out sponsor/ad sections (identifiable by section headers like "TOGETHER WITH [Sponsor]" or "PRESENTED BY [Sponsor]") and the "Trending AI Tools"/"Quick Hits" sections if those are handled separately or excluded

This is a second distinct parser type in the fetch layer (alongside "standard RSS"), specific to this source's bundled-HTML structure.

### 10.4 Special Case: Hacker News Missing Description
Hacker News's Algolia API returns no summary/description field — only a title and a link.

**Decision (finalized):** for each HN item, fetch the linked page's HTML and extract the `og:description` or standard `meta name="description"` tag as the summary. This is lightweight (a single request + tag lookup, not full-page scraping) and gives Groq real content to summarize in most cases. If neither meta tag is present, or the fetch fails/times out, fall back to title-only summarization for that specific item — no need for the whole pipeline to fail, just a per-item graceful degradation.

### 10.5 Verification Thresholds (starting defaults — tune after observing real data)
| Source | Threshold |
|---|---|
| Product Hunt | ≥ 50 upvotes in first 24h |
| Hacker News | ≥ 30 points OR ≥ 15 comments |
| Newsletters (all RSS sources above) | Inclusion = automatic pass |
| Funding/company news outlets | Coverage by the outlet = automatic pass |

### 10.6 Email Delivery
- **Provider:** Resend (already integrated in a prior project — CampusGuide's OTP system — so setup is largely reusable)
- **Plan:** Paid (already held by the builder), removing any free-tier volume concerns
