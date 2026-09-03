# Edge Cases & Corner Cases: Jarvis (PM-Focused AI Tools & News Digest)

This document identifies potential edge cases, failure modes, and corner cases for the digest system, organized by architectural component, along with recommended handling strategies.

## 1. Data Ingestion (Fetchers)

*   **1.1 Anti-Bot Protections on Metadata Fetch:** When fetching the HTML of Hacker News links to extract `og:description`, the target site might block the request via Cloudflare, return a captcha, or sit behind a paywall.
    *   *Handling:* Implement a strict timeout (e.g., 3-5 seconds). If it fails or returns a non-200 status, gracefully degrade to using only the title for the LLM prompt.
*   **1.2 The Rundown AI Layout Changes:** The custom HTML parser relies on specific HTML tags (like `<h4>` or specific sponsor text markers) to segment stories. If they redesign their newsletter, the parser will break.
    *   *Handling:* Wrap the parsing logic in a try-catch. If 0 items are extracted from a successfully fetched Rundown RSS item, log a specific warning indicating a likely layout change.
*   **1.3 Source API/RSS Outages:** One or more of the 10 sources might be down during the daily GitHub Action run.
    *   *Handling:* Fetchers must not fail the entire pipeline if one source fails. The system should log the failure, proceed with the successful sources, and still send the email.
*   **2.1 RSS Feed Down/Changed:** A newsletter changes its RSS URL structure, causing a 404.
    *   *Handling:* The fetcher includes an **Auto-Discovery Fallback** that hits the site's homepage, parses the HTML for RSS `<link>` tags, and automatically uses the newly discovered feed URL. If auto-discovery fails, the system logs the error and proceeds with other sources without crashing the pipeline.
*   **1.4 Malformed XML/Encoding Issues:** RSS feeds occasionally contain unescaped characters or invalid XML.
    *   *Handling:* Use a robust RSS parser that can tolerate minor XML violations or sanitize the feed string before parsing.

## 2. Processing & Deduplication

*   **2.1 Cross-Source URL Mismatches (Same Story, Different Link):** Product Hunt and Ben's Bites might feature the exact same tool, but Product Hunt links to `producthunt.com/posts/...` while Ben's Bites links to the tool's actual domain.
    *   *Handling:* Exact URL deduplication won't work here. The deduplication engine should use lightweight fuzzy matching (e.g., Jaro-Winkler distance on the title or tool name) to catch these.
*   **2.2 State Store Corruption:** The local state store (JSON/CSV) tracking sent items gets corrupted, deleted, or fails to save due to permission issues.
    *   *Handling:* If the file is unreadable, default to an empty state to ensure the pipeline doesn't crash, though this risks sending duplicates for one day. Always write to a temporary file first, then rename/move to prevent partial writes from corrupting the state.
*   **2.3 Zero Qualifying Items:** On a slow news day, 0 items might pass the verification thresholds across all sources.
    *   *Handling:* The system should detect an empty `FilteredItem` array and gracefully exit *without* sending an empty email to the user.

## 3. AI Processing (7-Agent Supervisor Architecture)

*   **3.1 API Rate Limits & Exhaustion:** The free-tier Gemini API hits a 429 quota exhausted error during a heavy news day.
    *   *Handling:* Supervisor catches the 429 error and uses the `swap_to_safe_side` strategy to dynamically hot-swap the exhausted Worker's API key with the reserve Safe-Side agent's API key.
*   **3.2 Poor Output Quality / Malformed JSON:** The fast model (`gemini-1.5-flash`) fails to understand a complex article and returns broken JSON, causing a `SyntaxError`.
    *   *Handling:* Supervisor catches the `MALFORMED_JSON` error and uses the `swap_to_smarter_model` strategy to dynamically upgrade the worker to `gemini-1.5-pro`, then retries the exact same task.
*   **3.3 Unknown / Catastrophic Errors:** A completely new error that the Supervisor has no predefined strategy for crashes the pipeline.
    *   *Handling:* Supervisor uses the `escalate_to_developer` strategy. The Safe-Side agent wakes up as a Developer, writes a TypeScript patch into `src/agents/supervisor.ts` to handle the new error, pushes to GitHub, and restarts the Railway server to heal the system.
*   **3.4 LLM Hallucinated Tags:** The LLM might assign a PM skill tag that is *not* in the strictly defined list of 13 approved tags.
    *   *Handling:* The prompt must strongly enforce the allowed tags. Post-generation, the system must validate the tag. If invalid, it should either coerce it to the closest match or default to "General productivity".
*   **3.4 Content Safety Triggers:** An AI tool related to cybersecurity or scraping might trigger the LLM's safety/harm filters, resulting in a refused generation.
    *   *Handling:* Catch the safety refusal exception. If an item is blocked, discard the item and log it, proceeding with the rest of the batch.
*   **3.5 Un-chunkable Giant Payloads:** An item has an enormous, un-chunkable block of text with no spaces or semantic boundaries (rare, but possible in raw HTML dumps).
    *   *Handling:* If semantic chunking fails, fall back to a hard character-limit truncation before sending to the LLM.

## 4. Delivery Layer

*   **4.1 Massive News Days (Payload Size):** An event like OpenAI DevDay might result in 30+ items passing the quality gates. The resulting email might exceed Gmail's clipping size (~102KB).
    *   *Handling:* While there is "no fixed item count ceiling" in the requirements, consider implementing a hard cap (e.g., max 15 items) sorted by engagement score to prevent email clipping and inbox fatigue.
*   **4.2 Resend API Outage:** The email service is down when the pipeline attempts to send.
    *   *Handling:* Since state is updated *after* successful send, failing at the Resend step means the items won't be marked as "sent". They will be picked up again in the next day's run, which is the desired self-healing behavior.
