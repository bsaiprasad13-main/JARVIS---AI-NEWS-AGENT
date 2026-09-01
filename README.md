# JARVIS - AI News Reporter

JARVIS is an automated, AI-powered daily digest agent that curates, filters, and summarizes the best tech news, products, and articles from across the web, delivering a high-quality summary directly to your inbox every morning.

## 🚀 Features

- **Multi-Source Fetching**: Scrapes and aggregates data from top sources including:
  - Hacker News
  - Product Hunt
  - The Rundown AI
  - Standard RSS feeds
- **Smart Quality Filtering**: Automatically filters out noise by enforcing source-specific quality bars (e.g., minimum upvotes or comments).
- **AI Summarization & Deduplication**: Uses **Groq (Llama-3)** to intelligently summarize the content, extract key takeaways ("Why it matters"), and merge duplicate stories across different sources.
- **Cross-Day Deduplication**: Maintains a local state store (`data/sent_items.json`) to guarantee you never receive the same news story twice.
- **Automated Email Delivery**: Sends a beautifully formatted HTML email digest via the **Resend API**.
- **Scheduled Execution**: Fully automated via GitHub Actions, and can be accurately triggered via [cron-job.org](https://cron-job.org).

## 🛠️ Tech Stack

- **TypeScript / Node.js**: Core runtime and scripting.
- **Groq API**: Blazing fast LLM inference for text summarization.
- **Resend**: Transactional email delivery.
- **GitHub Actions**: CI/CD and automated workflow runner.

## ⚙️ Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bsaiprasad13-main/JARVIS---AI-NEWS-AGENT.git
   cd JARVIS---AI-NEWS-AGENT
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
   *Required variables:*
   - `PRODUCT_HUNT_API_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY` (if fallback/additional LLM features are used)
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` (Must be a verified domain on Resend)
   - `RESEND_TO_EMAIL` (Comma-separated list of recipient emails)

4. **Run locally:**
   ```bash
   npm run start
   # or
   npx tsx src/index.ts
   ```

## ⏱️ Automation Setup (GitHub Actions)

This project uses a GitHub Action (`.github/workflows/daily-digest.yml`) to run automatically. 

To ensure the digest runs exactly on time without being subject to GitHub's internal cron queue delays, it is configured to use a `workflow_dispatch` trigger.
1. Create a GitHub Personal Access Token (PAT) with `repo` permissions.
2. Set up a free daily ping on [cron-job.org](https://cron-job.org) targeting your repository's dispatch endpoint.
3. Pass your PAT as a Bearer token in the `Authorization` header.

## 📝 License

MIT License
