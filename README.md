# JARVIS - AI News Reporter (7-Agent Autonomous Architecture)

JARVIS is an advanced, self-healing, multi-agent AI system that curates, filters, and summarizes the best tech news, products, and articles from across the web. It delivers a high-quality summary directly to your inbox every morning. 

What started as a simple scraper is now a **7-Agent Autonomous Network** featuring self-healing code generation, dynamic fallback strategies, and persistent memory.

## 🚀 Key Features

- **7-Agent Supervisor Architecture**: Two main supervisors (`SupervisorA` and `SupervisorB`) manage 4 data-processing workers and a reserve Safe-Side agent.
- **Dynamic Failsafe Strategies**: On failure (e.g., 429 quota exhaustion), the system dynamically picks recovery strategies like `swap_to_safe_side`, `swap_to_smarter_model`, or `retry_immediately` without human intervention.
- **Model Hierarchy Upgrades**: If data is too complex and causes bad JSON generation, workers automatically cycle up to smarter models (from `gemini-1.5-flash` to `gemini-1.5-pro`).
- **Self-Healing Code Generation**: If a catastrophic, unhandled error occurs, the Safe-Side agent wakes up as a **Developer Agent**, writes a TypeScript patch to fix the bug, compiles it, pushes to GitHub, and triggers a Railway restart!
- **Strategy Memory Persistence**: Supervisors persist past failures to `data/supervisor_memory.json` so the system "learns" from past errors across daily executions.
- **Multi-Source Fetching**: Scrapes Hacker News, Product Hunt, The Rundown AI, Anthropic, OpenAI, DeepMind, and standard RSS feeds.
- **Cross-Day Deduplication**: Maintains a local state store to guarantee you never receive the same news story twice.
- **Automated Email Delivery**: Sends beautifully formatted HTML digests via the **Resend API**.

## 🛠️ Tech Stack

- **TypeScript / Node.js**: Core runtime and agent orchestration.
- **Google Gemini API**: Heavy-lifting LLM inference (utilizing a multi-key pool for rate-limit evasion).
- **Express & Node-Cron**: Continuous server scheduling.
- **Resend**: Transactional email delivery and webhooks.
- **Railway**: Primary deployment and execution environment.

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
   - `GEMINI_API_KEY_1` to `GEMINI_API_KEY_4` (Worker keys)
   - `GEMINI_SAFE_SIDE_KEY` (Reserve/Developer key)
   - `GEMINI_SUPERVISOR_KEY` (Orchestration key)
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL` & `RESEND_TO_EMAIL`
   - `SOS_ALERT_EMAIL` (For critical system failures)

4. **Run locally:**
   ```bash
   npm run start
   # or
   npx tsx src/index.ts
   ```

## ⏱️ Automation Setup (Railway)

The project runs as a continuous Express server. Deploy this directly to **Railway**. The internal `node-cron` job will automatically trigger the 7-Agent workflow every day at exactly **09:00 AM IST**.

## 📝 License

MIT License
