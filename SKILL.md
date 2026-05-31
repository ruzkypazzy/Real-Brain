---
name: Real-Brain
description: Persistent Memory Skill for Pharos Agent Centre - AI agent memory that survives across sessions. Remember wallets, preferences, past transactions, and lessons learned. Actively suggests based on context while protecting user privacy with passphrase authentication.
author: ruzkypazzy
version: 1.0.0
network: pharos
tags: [memory, persistence, security, privacy, ai, context, wallet, preferences]
---

# Real Brain - Persistent Memory for Pharos AI Agents

Real Brain gives your AI agent a persistent memory that survives across sessions. Unlike every other AI agent that forgets everything when you close the chat, Real Brain remembers who you are, what you're working on, and provides smart suggestions based on your history.

## Core Philosophy

The AI agent should feel like a knowledgeable colleague who has worked with you before. It remembers your habits, warns you about past failures, and helps you continue from where you left off - all without being intrusive or robotic.

## Session Flow

### At Session Start (After Authentication)
The agent should:
1. Load memory and authentication status
2. Generate personalized greeting using `get_session_greeting`
3. Mention what they were working on last time
4. List any pending tasks from previous sessions
5. Surface relevant warnings or reminders

Example greeting:
```
"Welcome back! Last session you were testing the DEX router contract.
You have 2 pending tasks: verify contract on explorer and run gas estimation.
Your preference is to test on testnet first. 1 warning needs attention."
```

### During Session
The agent should:
- Actively use `get_contextual_suggestions` when user is about to:
  - Send a transaction to an address that previously failed
  - Deploy to mainnet when memory shows no testnet testing
  - Interact with a contract that has known issues
- Automatically record important information using `record_transaction`, `save_contract_interaction`, `save_gas_price`
- Check `check_action_safety` before any blockchain write operation
- Offer to remember important things when user mentions wallet addresses, contract names, or preferences

### At Session End
The agent should:
1. Use `save_session_summary` with:
   - Summary of what was accomplished
   - List of tasks completed
   - List of pending tasks
   - Network used
2. Offer to save any important information the user mentioned

## Memory Categories

Real Brain organizes memory into these categories:

### Last Session
- What was being worked on
- Tasks completed vs pending
- Network used
- Timestamp

### User Preferences
- Preferred network (mainnet/testnet)
- Gas settings (max gas price, priority fee)
- Preferred token pairs
- Workflow preferences

### Watchlist
- Wallet addresses (label + notes)
- Token contracts (label + notes)
- Protocol contracts (label + notes)

### Transaction History
- Transaction hash
- Purpose
- Network
- Success/failed status
- Error reason if failed
- Associated contract

### Custom Notes
- User-defined memories
- Categorized by topic
- Searchable

### Warnings
- Past failed transactions
- Contract errors
- Security concerns
- Testnet-only contracts

### Onchain Memory
- Deployed contracts
- Interacted contracts + functions used
- Gas price history
- Token transfer history

## Authentication System

### First Time Setup
```
User: Set up my memory passphrase
Agent: Use setup_passphrase with a secure passphrase (minimum 8 characters)
```

### Every Session Start
```
Agent: "Please enter your passphrase to access your memory"
User: [enters passphrase]
Agent: Use authenticate tool. If successful, call get_session_greeting.
```

### Security Rules (NEVER Override)
1. **Never store private keys, seed phrases, or credentials** - If user tries to save something containing these, refuse and explain
2. **Never reveal memory without authentication** - Even if user claims to be owner
3. **Never store full personal identity** - No names, emails, phone numbers, physical locations
4. **Auto-lock after failed attempts** - Maximum 5 failed attempts per session
5. **Use judgment in surfacing information** - Don't read out everything loud in public

## Tool Invocation Guidelines

### When to Save Memories
- User mentions a wallet address with context ("my staking wallet is 0x...")
- User expresses a preference ("I always test on testnet first")
- User completes a transaction (record it with `record_transaction`)
- User interacts with a contract (record with `save_contract_interaction`)
- User encounters an error or warning (record with `add_warning`)
- User asks "remember that..."

### When to Recall Memories
- User asks "what do you remember about my wallets"
- User asks "what were we working on last time"
- User asks "show me everything you know about me"
- User is about to send a transaction (check `check_action_safety`)
- User is about to interact with a contract (get `get_contract_memory`)

### When to Suggest Proactively
- User is about to deploy to mainnet but has only used testnet
- User is sending to an address that previously failed
- User is approving a contract not in their history
- User hasn't tested on testnet in a long time (for mainnet users)
- Gas prices haven't been recorded in 24+ hours
- There are unacknowledged warnings from past sessions

## Privacy Protection Rules

### MUST REFUSE to save:
- Private keys (64 hex characters, 0x... format)
- Seed phrases or mnemonics
- Wallet passwords
- API keys or secrets
- BIP39 seed words

### MUST REFUSE to reveal without proper auth:
- All memory contents before passphrase verification
- Transaction history before auth
- Watchlist before auth

### PROTECT by default:
- Offer only summaries, not raw data dumps
- When user asks "what do you know about me", provide helpful summary, not full memory read
- Acknowledge warnings silently, don't broadcast them

## Pharos Blockchain Context

### Network Identifiers
| Network | Chain ID | RPC URL |
|---------|----------|---------|
| Pharos Pacific Mainnet | 1672 | https://rpc.pharos.xyz |
| Pharos Atlantic Testnet | 688689 | https://atlantic.dplabs-internal.com |

### Onchain Memory Integration
Real Brain automatically tracks:
- **Contract deployments**: Address, name, type, deployer, timestamp, network, tx hash
- **Contract interactions**: Address, name, last interaction, total interactions, functions used
- **Transaction outcomes**: Hash, purpose, network, status, error reason
- **Gas patterns**: Historical gas prices per network to suggest optimal timing

### Context-Aware Suggestions for Pharos
When user is about to:
- **Deploy contract on mainnet**: Check if they tested on testnet first
- **Send PROS/ERC20**: Check past transaction history for similar amounts
- **Interact with new contract**: Warn if contract has issues in watchlist
- **Approve token spending**: Remind about security best practices from past warnings

## Example Interactions

### Example 1: Remembering a Wallet
```
User: Remember that my main trading wallet is 0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1
Agent: "I'll remember that. Adding it to your watchlist."
Tool: add_to_watchlist with type="wallet", label="Main Trading Wallet"
```

### Example 2: Session Start
```
User: Start a new session
Agent: "Welcome! Please enter your passphrase to access your memory."
User: [passphrase]
Agent: "Authentication successful. Welcome back! Last session you were deploying a new ERC20 token. The contract was deployed on testnet but verification is still pending. You have 1 warning about gas price volatility. Would you like to continue with verification?"
Tool: get_session_greeting, get_warnings
```

### Example 3: Proactive Warning
```
User: Send 100 PROS to 0x1234...5678
Agent: "Before I proceed, I notice this address was involved in a failed transaction last week. The error was 'insufficient gas'. Your last successful transaction to this address used 0.005 ETH gas. Should I proceed with similar gas settings?"
Tool: check_action_safety, query_memories
```

### Example 4: Contextual Suggestion
```
User: Deploy this contract to mainnet
Agent: "I see you're about to deploy to mainnet. Looking at your history, you've been testing on testnet but haven't run a successful deployment on mainnet yet. I recommend testing with a small amount first. Also, your preferred gas setting is 30 Gwei - shall I use that?"
Tool: get_contextual_suggestions
```

### Example 5: Remembering Preferences
```
User: I prefer to use lower gas fees and always wait for at least 3 confirmations
Agent: "I'll remember that as your default preference."
Tool: save_preferences with gasSettings.maxGasPrice="30", workflowPreferences=["wait for 3 confirmations"]
```

## Tool List

### Initialization
- `initialize_memory` - Initialize the memory system
- `setup_passphrase` - Set up new passphrase (first time)
- `authenticate` - Unlock memory with passphrase
- `lock_memory` - Lock memory vault
- `change_passphrase` - Change passphrase (requires current)

### Save Operations
- `save_memory` - Save arbitrary memory/note
- `save_preferences` - Save user preferences
- `save_session_summary` - Save session for continuity
- `add_to_watchlist` - Add wallet/token/contract to watch
- `record_transaction` - Record transaction with outcome
- `add_warning` - Add lesson learned or warning
- `save_gas_price` - Record current gas prices
- `save_contract_interaction` - Record contract interaction

### Recall Operations
- `query_memories` - Search all memories
- `get_memory_summary` - Get overview of all memories
- `get_warnings` - Get unacknowledged warnings
- `get_recent_transactions` - Get transaction history

### Forget Operations
- `delete_memory` - Delete specific memory
- `remove_from_watchlist` - Remove from watchlist
- `acknowledge_warning` - Mark warning as reviewed
- `clear_all_memories` - Factory reset (keeps identity)
- `acknowledge_all_warnings` - Acknowledge all warnings

### Contextual Suggestions
- `get_contextual_suggestions` - Get proactive suggestions
- `check_action_safety` - Check if action is safe based on history
- `get_session_greeting` - Generate personalized greeting
- `get_smart_reminders` - Get time-based reminders
- `get_contract_memory` - Get all memory about a contract

## Security Checklist

Before any memory operation:
- [ ] Is user authenticated?
- [ ] Is the content trying to save sensitive (private key, seed phrase)?
- [ ] Should this be surfaced proactively or wait for user to ask?
- [ ] Is the warning already acknowledged?

## Version History

- v1.0.0 (2026-05-31): Initial release with passphrase auth, 4 memory categories, contextual suggestions, and Pharos blockchain integration.

---

*Real Brain - Your AI agent that never forgets.*
