# Changelog

All notable changes to this project will be documented in this file.

## Iteration 3 - 2026-09-03 (7-Agent Architecture)

### Added
- **7-Agent Autonomous Architecture**: Overhauled the workflow to use a Supervisor pattern. Two main supervisors (`SupervisorA` and `SupervisorB`) manage 4 data-processing workers and a reserve Safe-Side agent.
- **Dynamic Failsafe Strategies**: Integrated a strategy toolbox within `SupervisorAgent`. On failure (e.g. 429 quota exhaustion), the system picks recovery strategies like `swap_to_safe_side`, `swap_to_smarter_model`, or `retry_immediately`.
- **Strategy Memory Persistence**: Introduced `AgentMemory` to persist past failures to `data/supervisor_memory.json`. The Supervisors use this context to remember how to handle specific workflow errors.
- **Model Hierarchy Upgrades**: Workers can dynamically step up to smarter models (cycling from `gemini-1.5-flash` to `gemini-1.5-pro` to `gemini-1.0-pro`) if they encounter complex data that causes `MALFORMED_JSON` or poor output quality.
- **Self-Healing Developer Agent**: Built an advanced code-patching fallback. If an entirely unknown error crashes the pipeline, the Safe-Side agent acts as a Developer, physically writes a TypeScript patch into `src/agents/supervisor.ts`, verifies it with `tsc`, pushes the fix to GitHub, and triggers a Railway restart.
- **Continuous Express Server**: Replaced the standalone script with an Express server (`src/index.ts`). The workflow is scheduled via `node-cron` to trigger at 09:00 AM IST.
- **Resend Webhooks**: Added a `/api/webhooks/resend` endpoint to listen for email delivery events.
- **SOS Fallback Alerts**: Added a `sendSOSAlert` function to immediately notify the admin if the system completely fails and cannot self-heal.

### Removed
- **Groq SDK**: Completely removed Groq from the codebase. The system now strictly uses a multi-key Gemini setup to distribute load and handle rate limits.

## Iteration 2 - 2026-09-02

### Added
- **LLM Rate Limiting Engine**: Implemented a comprehensive `RateLimiter` (`src/summarizer/rateLimiter.ts`) that tracks API limits using a rolling 60-second window. It intelligently pauses execution if Requests Per Minute (RPM) or Tokens Per Minute (TPM) thresholds are approaching, completely eliminating `429 Too Many Requests` errors.
- **Token-Aware Smart Chunking**: Replaced hardcoded chunk sizes (e.g., 15 items) with dynamic chunking based on estimated token counts and provider context limits.
- **Model Configuration**: Added RPM and TPM definitions to `models.yaml` and implemented a strongly-typed parser (`src/models/config.ts`).
- **New Sources**: Added OpenAI Blog and Google DeepMind to the standard RSS ingestion (`data/sources.json`).
- **Anthropic Fetcher**: Implemented a resilient `AnthropicFetcher` (`src/fetchers/anthropicFetcher.ts`) with automatic fallback logic to a GitHub Pages mirror if the primary RSSHub endpoint fails.
- **Deduplication Engine**: Added a new intra-day deduplication processor (`src/processor/dedup.ts`) that runs immediately after fetching. It intelligently drops duplicate stories by matching exact URLs or by comparing normalized titles (ignoring case and non-alphanumeric characters).

### Changed
- **Dynamic AI Tagging**: Removed the hardcoded `PM_TAGS` list in both Gemini and Groq summarizers (`src/summarizer/gemini.ts`, `src/summarizer/groq.ts`). The LLMs now dynamically generate 2-3 concise keyword tags that best categorize each news item based on its specific context.
- **Architecture Documentation**: Updated `doc/architecture.md` to reflect the new sources, deduplication pipeline, and dynamic tagging approach.

## Iteration 1 - Initial Project Creation
- Initial project architecture and implementation.
- Dual-Provider LLM Router (Groq + Gemini).
- Standard RSS Fetcher, Product Hunt Fetcher, Hacker News Fetcher, and The Rundown AI Fetcher.
- Quality gate filtering based on upvotes/points.
- Resend API email dispatch.
