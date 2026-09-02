# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased / Latest Update]

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

## [v1.0.0] - Initial Version
- Initial project architecture and implementation.
- Dual-Provider LLM Router (Groq + Gemini).
- Standard RSS Fetcher, Product Hunt Fetcher, Hacker News Fetcher, and The Rundown AI Fetcher.
- Quality gate filtering based on upvotes/points.
- Resend API email dispatch.
