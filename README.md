# Black Bull Trivia 🐂

A minimal viable trivia quiz app for the **$ANSEM** community. Built with Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, and Solana wallet integration.

> **For community fun only. Not financial advice.**

## Features

- **Dark bull-themed UI** — black background, gold & green accents
- **Solana wallet connection** — Phantom & Solflare via `@solana/wallet-adapter`
- **50 trivia questions** — loaded from `src/data/questions.json`
- **10 random questions per round** — shuffled each play
- **Weekly free round** — 1 free round per wallet per week (resets Monday UTC)
- **Paid extra rounds** — 0.02 SOL per additional round
- **On-chain payment** — SOL transferred to hardcoded prize wallet
- **Funny result titles** — Diamond Hand Bull, Stimmy Legend, Charge Forward Champion, etc.
- **Shareable result card** — download PNG via `html2canvas`
- **Weekly leaderboard** — top 10 scores (localStorage)
- **Disclaimers** — shown in header, footer, quiz, results, and leaderboard

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Wallet | @solana/wallet-adapter |
| State | React state + TanStack React Query |
| Storage | localStorage (weekly plays + leaderboard) |
| Sharing | html2canvas |

## Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- A Solana wallet (Phantom recommended)

### Installation

```bash
# Clone or navigate to the project
cd black-bull-trivia

# Install dependencies
npm install

# Copy environment file (optional)
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Configuration

### Prize Wallet

Edit `src/lib/constants.ts` to set your community prize wallet:

```typescript
export const PRIZE_WALLET = "2ya93F943VD84PhF6gTCLfq8Y6hSNC18WxygsYGyFMHh";
```

### Round Cost

Default is `0.02 SOL`. Change in the same file:

```typescript
export const ROUND_COST_SOL = 0.02;
```

### Solana Mainnet RPC

The app connects to **Solana mainnet** for all wallet and payment operations. Prize wallet payments go to `2ya93F943VD84PhF6gTCLfq8Y6hSNC18WxygsYGyFMHh`.

Create `.env.local`:

```env
NEXT_PUBLIC_SOLANA_RPC=https://solana-rpc.publicnode.com
```

For production traffic, use a dedicated RPC provider. Free tiers: [Helius](https://helius.dev), [QuickNode](https://quicknode.com), [Alchemy](https://alchemy.com).

```env
NEXT_PUBLIC_SOLANA_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Questions

Replace or extend `src/data/questions.json`. Each question needs:

```json
{
  "id": 1,
  "question": "Your question here?",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "category": "optional-category"
}
```

`correctIndex` is 0-based (0 = first option).

## How It Works

### Weekly Free Round

- Tracked in `localStorage` per wallet address
- Week ID uses ISO week format (`YYYY-Www`) with Monday UTC reset
- Logic in `src/lib/weekly.ts`

### Payment Flow

1. User clicks **"Pay 0.02 SOL for New Round"**
2. App creates a Solana `SystemProgram.transfer` transaction
3. User signs in their wallet
4. Transaction confirmed on-chain
5. Quiz starts automatically

### Scoring & Titles

| Score % | Title |
|---------|-------|
| ≥ 90% | Diamond Hand Bull |
| ≥ 70% | Charge Forward Champion |
| ≥ 50% | Stimmy Legend |
| ≥ 30% | Paper Hand Panda |
| < 30% | Exit Liquidity Enjoyer |

### Leaderboard

- Top 10 scores for the current week
- Stored in `localStorage` (client-side only)
- Best score per wallet per week is kept
- For production, replace with a backend API + database

## Project Structure

```
black-bull-trivia/
├── src/
│   ├── app/
│   │   ├── globals.css          # Theme + wallet adapter overrides
│   │   ├── layout.tsx           # Root layout + fonts
│   │   └── page.tsx             # Main page
│   ├── components/
│   │   ├── ui/                  # shadcn/ui primitives
│   │   ├── disclaimer.tsx
│   │   ├── leaderboard.tsx
│   │   ├── providers.tsx
│   │   ├── quiz-game.tsx
│   │   ├── result-card.tsx
│   │   ├── start-screen.tsx
│   │   ├── trivia-app.tsx
│   │   └── wallet-provider.tsx
│   ├── data/
│   │   └── questions.json       # 50 trivia questions
│   ├── hooks/
│   │   └── use-toast.ts
│   └── lib/
│       ├── constants.ts         # Prize wallet, costs, disclaimer
│       ├── leaderboard.ts
│       ├── payment.ts
│       ├── quiz.ts
│       ├── utils.ts
│       └── weekly.ts
├── .env.example
├── package.json
├── tailwind.config.ts
└── README.md
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add `NEXT_PUBLIC_SOLANA_RPC` environment variable
4. Deploy

### Other Platforms

Any platform supporting Next.js 14 works. Ensure environment variables are set.

## Limitations (MVP)

- **localStorage only** — weekly plays and leaderboard are per-browser, not server-enforced
- **No anti-cheat** — users can clear localStorage for extra free rounds
- **Mainnet payments** — real SOL transactions; use small amounts when testing
- **No backend** — for production, add API routes + database for persistent leaderboard

## Development Tips

### Adding shadcn Components

```bash
npx shadcn@latest add [component-name]
```

## License

MIT — built for the $ANSEM community. Have fun, bulls. 🐂

---

**Disclaimer:** This app is for community entertainment only. It is not financial advice. Cryptocurrency transactions are irreversible. Play responsibly.