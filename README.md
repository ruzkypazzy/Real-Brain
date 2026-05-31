# Real Brain - Persistent Memory Skill for Pharos Agent

![Pharos Network](https://img.shields.io/badge/Pharos-Network-4F46E5)
![AI Agent](https://img.shields.io/badge/AI-Agent-Memory-10B981)
![License](https://img.shields.io/badge/License-MIT-green)

## Overview

Real Brain is a persistent memory skill for the Pharos Agent that gives AI agents the ability to remember information across sessions. Unlike traditional AI agents that forget everything when you close the chat, Real Brain provides:

- **Session Continuity** - Continue from where you left off
- **Contextual Suggestions** - Proactive warnings based on history
- **Privacy Protection** - Passphrase-secured memory vault
- **Smart Recall** - Search and retrieve any stored information

## Why Real Brain?

Every AI agent today suffers from the same problem: when you close the chat, everything is forgotten. You have to re-explain who you are, what wallet you use, and what you were working on - every single time.

Real Brain solves this by giving your AI agent a persistent memory that:

1. **Survives sessions** - Memory persists across conversations
2. **Understands context** - Provides smart suggestions based on history
3. **Protects privacy** - Passphrase authentication required
4. **Stays secure** - Never stores private keys or sensitive credentials

## Features

### 1. Session Memory
- Last session summary and pending tasks
- Automatic greeting at session start
- Continuity across conversations

### 2. User Preferences
- Preferred network (mainnet/testnet)
- Gas settings and limits
- Token pairs and workflows

### 3. Watchlist
- Track wallet addresses
- Monitor token contracts
- Note protocol interactions

### 4. Transaction History
- Record all transactions with outcomes
- Track failed transactions for future warnings
- Pattern analysis for smart suggestions

### 5. Onchain Memory (Unique to Real Brain)
- **Contract Deployment Memory** - Remember every contract you've deployed
- **Interaction History** - Track which functions you've called on each contract
- **Gas Price History** - Monitor gas patterns for optimal timing
- **Token Transfer Memory** - Remember all your token movements

### 6. Contextual Suggestions
- Warn before sending to addresses that previously failed
- Remind about testnet preferences before mainnet operations
- Surface warnings automatically when similar situations arise
- Offer smart reminders based on patterns

### 7. Privacy Protection
- Passphrase authentication
- Never stores private keys or seed phrases
- Auto-lock after failed attempts
- Privacy rules that cannot be overridden

## Installation

### Prerequisites
- Node.js >= 20.0.0
- Pharos Agent Kit installed

### Clone the Repository
```bash
git clone https://github.com/ruzkypazzy/pharos-real-brain.git
cd pharos-real-brain
```

### Install Dependencies
```bash
npm install
```

### Build
```bash
npm run build
```

## Usage

### 1. Initialize Memory
```typescript
import { initializeMemory } from "./tools/real_brain/memory-core";

const result = await initializeMemory();
console.log(result.isAuthenticated); // false initially
```

### 2. Set Up Passphrase (First Time)
```typescript
import { setupPassphrase } from "./tools/real_brain/memory-core";

const result = await setupPassphrase("yourSecurePassphrase123");
```

### 3. Authenticate Every Session
```typescript
import { authenticate } from "./tools/real_brain/memory-core";

const result = await authenticate("yourSecurePassphrase123");
if (result.success) {
  // Memory unlocked, get session greeting
}
```

### 4. Save Memories
```typescript
import { saveMemory, addToWatchlist, savePreferences } from "./tools/real_brain/memory-operations";

// Remember a wallet
await addToWatchlist("0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1", "wallet", "Main Trading Wallet", "Used for DeFi");

// Remember a preference
await savePreferences({
  preferredNetwork: "testnet",
  maxGasPrice: "30"
});

// Save arbitrary memory
await saveMemory("This contract is my DEX router", "protocol");
```

### 5. Get Contextual Suggestions
```typescript
import { getContextualSuggestions, checkActionSafety } from "./tools/real_brain/contextual-suggestions";

// Before sending to mainnet
const suggestions = await getContextualSuggestions({
  currentAction: "deploy",
  network: "mainnet"
});

// Before any blockchain write
const safety = await checkActionSafety({
  type: "send",
  targetAddress: "0x1234...",
  network: "mainnet"
});
```

### 6. Session Greeting
```typescript
import { generateSessionGreeting } from "./tools/real_brain/contextual-suggestions";

const greeting = await generateSessionGreeting();
// "Welcome back! Last session you were deploying a new token.
// You have 1 pending task: verify contract. 2 warnings need attention."
```

## AI Agent Integration

### LangChain Tools
```typescript
import { createRealBrainTools } from "./langchain/real_brain";

// Create all 25 Real Brain tools
const tools = createRealBrainTools();

// Use with any LangChain-compatible agent
const agent = new ChatOpenAI({ model: "gpt-4" });
const agentWithTools = agent.bind(tools);
```

### MCP Actions
```typescript
import { realBrainActions } from "./actions/real_brain";

// All 17 actions available for MCP integration
// Actions include: AUTHENTICATE, SAVE_MEMORY, QUERY_MEMORIES,
// GET_CONTEXTUAL_SUGGESTIONS, CHECK_ACTION_SAFETY, etc.
```

## Memory Categories

| Category | Description | Tools |
|----------|-------------|-------|
| Last Session | Summary, tasks completed, pending | `save_session_summary`, `get_session_greeting` |
| Preferences | Network, gas, tokens, workflows | `save_preferences`, `query_memories` |
| Watchlist | Wallets, tokens, contracts | `add_to_watchlist`, `remove_from_watchlist` |
| Transaction History | Hash, purpose, status, error | `record_transaction`, `get_recent_transactions` |
| Custom Notes | User-defined memories | `save_memory`, `delete_memory` |
| Warnings | Failed txs, errors, lessons | `add_warning`, `get_warnings`, `acknowledge_warning` |
| Onchain Memory | Deploys, interactions, gas | `save_contract_interaction`, `save_gas_price`, `get_contract_memory` |

## Security Rules

### NEVER Stored
- Private keys (64 hex characters)
- Seed phrases or mnemonics
- Wallet passwords
- API keys or secrets
- Full names, emails, phone numbers

### Always Required
- Passphrase authentication
- Re-authentication after lock
- Maximum 5 failed attempts per session

### Protected by Default
- No raw data dumps to user
- Summary-based responses
- Silent warning acknowledgment

## Pharos Blockchain Context

### Supported Networks
| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Pharos Pacific Mainnet | 1672 | https://rpc.pharos.xyz |
| Pharos Atlantic Testnet | 688689 | https://atlantic.dplabs-internal.com |

### Onchain Memory Features
Real Brain automatically tracks:
- Contract deployments (address, name, type, deployer, timestamp, network, tx hash)
- Contract interactions (add
