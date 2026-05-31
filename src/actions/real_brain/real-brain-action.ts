/**
 * Real Brain Action
 * MCP action definitions for Real Brain memory skill
 */

import { Action } from "../../types/action";
import { z } from "zod";
import {
  initializeMemory,
  setupPassphrase,
  authenticate,
  lockVault,
  changePassphrase,
} from "../../tools/real_brain/memory-core";
import {
  saveMemory,
  savePreferences,
  saveSessionSummary,
  addToWatchlist,
  recordTransaction,
  addWarning,
  queryMemories,
  getAllMemoriesSummary,
  deleteMemory,
  clearAllMemories,
  acknowledgeAllWarnings,
} from "../../tools/real_brain/memory-operations";
import {
  getContextualSuggestions,
  checkActionSafety,
  generateSessionGreeting,
  getContractMemory,
} from "../../tools/real_brain/contextual-suggestions";

// =============================================================================
// AUTHENTICATION ACTIONS
// =============================================================================

export const initializeMemoryAction: Action = {
  name: "INITIALIZE_MEMORY",
  similes: ["init memory", "start memory", "setup memory", "initialize real brain"],
  description:
    "Initialize the Real Brain memory system. Must be called before any other memory operations. Returns authentication status.",
  examples: [
    [
      {
        input: {},
        output: { status: "success", message: "Memory initialized", isAuthenticated: false },
        explanation: "Memory system initializes, user needs to authenticate",
      },
    ],
  ],
  schema: z.object({}),
  handler: async (_agent: any, _input: Record) => {
    const result = await initializeMemory();
    return result;
  },
};

export const setupPassphraseAction: Action = {
  name: "SETUP_PASSPHRASE",
  similes: ["set passphrase", "create passphrase", "setup password", "new passphrase"],
  description: "Set up a new passphrase for the memory vault. Required on first use. Minimum 8 characters.",
  examples: [
    [
      {
        input: { passphrase: "mySecurePass123" },
        output: { status: "success", message: "Passphrase set up successfully" },
        explanation: "User sets up a new passphrase for their memory vault",
      },
    ],
  ],
  schema: z.object({
    passphrase: z.string().min(8).describe("Your chosen passphrase (minimum 8 characters)"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await setupPassphrase(input.passphrase);
    return result;
  },
};

export const authenticateAction: Action = {
  name: "AUTHENTICATE",
  similes: ["unlock memory", "login", "authenticate me", "enter passphrase"],
  description: "Authenticate with passphrase to unlock the memory vault.",
  examples: [
    [
      {
        input: { passphrase: "mySecurePass123" },
        output: { status: "success", message: "Authentication successful" },
        explanation: "User provides correct passphrase to unlock memory",
      },
    ],
  ],
  schema: z.object({
    passphrase: z.string().describe("Your passphrase"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await authenticate(input.passphrase);
    return result;
  },
};

export const lockMemoryAction: Action = {
  name: "LOCK_MEMORY",
  similes: ["lock memory", "lock vault", "secure memory", "lock"],
  description: "Lock the memory vault. Requires re-authentication to access memories again.",
  examples: [
    [
      {
        input: {},
        output: { status: "success", message: "Memory vault locked" },
        explanation: "User locks their memory vault for security",
      },
    ],
  ],
  schema: z.object({}),
  handler: async (_agent: any, _input: Record) => {
    const result = lockVault();
    return result;
  },
};

// =============================================================================
// MEMORY OPERATIONS ACTIONS
// =============================================================================

export const saveMemoryAction: Action = {
  name: "SAVE_MEMORY",
  similes: ["remember this", "save this", "store memory", "remember that"],
  description:
    "Save a memory or note. The AI agent should automatically categorize. Cannot save private keys, seed phrases, or credentials - these are always rejected for security.",
  examples: [
    [
      {
        input: { content: "My main wallet is 0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1", category: "wallet" },
        output: { status: "success", message: "Memory saved to wallet category" },
        explanation: "User asks AI to remember their main wallet address",
      },
    ],
  ],
  schema: z.object({
    content: z.string().describe("What to remember"),
    category: z.string().optional().describe("Optional category hint (wallet, preference, project)"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await saveMemory(input.content, input.category);
    return result;
  },
};

export const savePreferencesAction: Action = {
  name: "SAVE_PREFERENCES",
  similes: ["set preference", "my preference", "save settings", "remember my preference"],
  description: "Save user preferences for network, gas, tokens, and workflows.",
  examples: [
    [
      {
        input: { preferredNetwork: "testnet", maxGasPrice: "30" },
        output: { status: "success", message: "Preferences updated" },
        explanation: "User sets their preference to testnet with 30 Gwei max gas",
      },
    ],
  ],
  schema: z.object({
    preferredNetwork: z.enum(["mainnet", "testnet"]).optional().describe("Preferred network"),
    maxGasPrice: z.string().optional().describe("Maximum gas price in Gwei"),
    tokenPairs: z.array(z.string()).optional().describe("Preferred token pairs"),
    workflowPreferences: z.array(z.string()).optional().describe("Workflow preferences"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await savePreferences(input);
    return result;
  },
};

export const saveSessionSummaryAction: Action = {
  name: "SAVE_SESSION_SUMMARY",
  similes: ["save session", "end session", "summarize session", "session summary"],
  description: "Save a summary of the current session for continuity in future sessions.",
  examples: [
    [
      {
        input: {
          summary: "Deployed and tested new ERC20 token on testnet",
          tasksCompleted: ["deployed token", "tested transfer"],
          tasksPending: ["verify on explorer"],
          network: "testnet",
        },
        output: { status: "success", message: "Session summary saved" },
        explanation: "AI saves session summary at the end of work",
      },
    ],
  ],
  schema: z.object({
    summary: z.string().describe("What was accomplished"),
    tasksCompleted: z.array(z.string()).describe("Completed tasks"),
    tasksPending: z.array(z.string()).describe("Pending tasks"),
    network: z.enum(["mainnet", "testnet"]).describe("Network used"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await saveSessionSummary(
      input.summary,
      input.tasksCompleted,
      input.tasksPending,
      input.network
    );
    return result;
  },
};

export const addToWatchlistAction: Action = {
  name: "ADD_TO_WATCHLIST",
  similes: ["watch this", "add address", "track this", "watchlist add"],
  description: "Add a wallet address, token, or contract to the watchlist for tracking.",
  examples: [
    [
      {
        input: { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1", type: "wallet", label: "Trading Wallet" },
        output: { status: "success", message: "Added to watchlist" },
        explanation: "User adds their trading wallet to the watchlist",
      },
    ],
  ],
  schema: z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("Address to watch"),
    type: z.enum(["token", "contract", "wallet"]).describe("Type of address"),
    label: z.string().describe("Friendly name for this address"),
    notes: z.string().optional().describe("Additional notes"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await addToWatchlist(input.address, input.type, input.label, input.notes);
    return result;
  },
};

export const recordTransactionAction: Action = {
  name: "RECORD_TRANSACTION",
  similes: ["record tx", "log transaction", "save transaction", "note transaction"],
  description: "Record a transaction for future reference, learning, and pattern analysis.",
  examples: [
    [
      {
        input: {
          hash: "0x1234567890abcdef",
          purpose: "Transfer PROS to staking contract",
          network: "mainnet",
          status: "success",
        },
        output: { status: "success", message: "Transaction recorded" },
        explanation: "AI automatically records successful transaction",
      },
    ],
  ],
  schema: z.object({
    hash: z.string().describe("Transaction hash"),
    purpose: z.string().describe("What the transaction was for"),
    network: z.enum(["mainnet", "testnet"]).describe("Network"),
    status: z.enum(["success", "failed", "pending"]).describe("Transaction status"),
    errorReason: z.string().optional().describe("Reason for failure if applicable"),
    contract: z.string().optional().describe("Contract address involved"),
    tokenAmount: z.string().optional().describe("Amount transferred"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await recordTransaction(
      input.hash,
      input.purpose,
      input.network,
      input.status,
      input.errorReason,
      input.contract,
      input.tokenAmount
    );
    return result;
  },
};

export const addWarningAction: Action = {
  name: "ADD_WARNING",
  similes: ["add warning", "note this error", "remember this issue", "log problem"],
  description: "Add a warning or lesson learned for future reference and proactive suggestions.",
  examples: [
    [
      {
        input: {
          type: "failed_tx",
          description: "Transaction failed due to insufficient gas - used 0.001 ETH but needed 0.003 ETH",
          relatedAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1",
        },
        output: { status: "success", message: "Warning added" },
        explanation: "AI records a failed transaction as a warning to avoid in future",
      },
    ],
  ],
  schema: z.object({
    type: z.enum(["failed_tx", "contract_error", "security", "testnet_only"]).describe("Warning type"),
    description: z.string().describe("What happened"),
    relatedAddress: z.string().optional().describe("Related contract/address"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await addWarning(input.type, input.description, input.relatedAddress);
    return result;
  },
};

// =============================================================================
// RECALL ACTIONS
// =============================================================================

export const queryMemoriesAction: Action = {
  name: "QUERY_MEMORIES",
  similes: ["search memory", "what do you remember", "find memory", "query memories"],
  description: "Search through all memories and retrieve relevant information.",
  examples: [
    [
      {
        input: { query: "wallets" },
        output: {
          relevantMemories: [{ type: "watchlist", label: "Trading Wallet" }],
          suggestions: ["Your preferred wallet is 0x742d..."],
          warnings: [],
          context: "Last session: Testing new token contract",
        },
        explanation: "User asks about their wallets, AI retrieves from watchlist",
      },
    ],
  ],
  schema: z.object({
    query: z.string().describe("Search query"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await queryMemories(input.query);
    return { status: "success", data: result };
  },
};

export const getMemorySummaryAction: Action = {
  name: "GET_MEMORY_SUMMARY",
  similes: ["memory summary", "show memories", "what do you know", "memory overview"],
  description: "Get a summary of all stored memories including counts and categories.",
  examples: [
    [
      {
        input: {},
        output: {
          watchlistCount: 5,
          transactionCount: 12,
          notesCount: 8,
          warningsCount: 2,
        },
        explanation: "AI provides overview of user's memory contents",
      },
    ],
  ],
  schema: z.object({}),
  handler: async (_agent: any, _input: Record) => {
    const result = await getAllMemoriesSummary();
    return result;
  },
};

export const getSessionGreetingAction: Action = {
  name: "GET_SESSION_GREETING",
  similes: ["greet me", "welcome back", "hello", "start conversation"],
  description: "Generate a personalized greeting based on session history. Use at session start.",
  examples: [
    [
      {
        input: {},
        output: {
          greeting:
            "Welcome back! Last session you were testing the DEX router. You have 1 pending task. 2 warnings need attention.",
        },
        explanation: "AI generates personalized welcome with context",
      },
    ],
  ],
  schema: z.object({}),
  handler: async (_agent: any, _input: Record) => {
    const greeting = await generateSessionGreeting();
    return { status: "success", data: { greeting } };
  },
};

// =============================================================================
// FORGET ACTIONS
// =============================================================================

export const clearAllMemoriesAction: Action = {
  name: "CLEAR_ALL_MEMORIES",
  similes: ["clear memory", "reset memory", "forget everything", "fresh start"],
  description: "Clear all memories except user identity. Use when user wants a fresh start.",
  examples: [
    [
      {
        input: {},
        output: { status: "success", message: "All memories cleared" },
        explanation: "User requests factory reset of their memory",
      },
    ],
  ],
  schema: z.object({}),
  handler: async (_agent: any, _input: Record) => {
    const result = await clearAllMemories();
    return result;
  },
};

export const acknowledgeAllWarningsAction: Action = {
  name: "ACKNOWLEDGE_ALL_WARNINGS",
  similes: ["clear warnings", "acknowledge warnings", "dismiss warnings"],
  description: "Acknowledge all warnings at once.",
  examples: [
    [
      {
        input: {},
        output: { status: "success", message: "Acknowledged 3 warnings" },
        explanation: "User acknowledges all pending warnings",
      },
    ],
  ],
  schema: z.object({}),
  handler: async (_agent: any, _input: Record) => {
    const result = await acknowledgeAllWarnings();
    return result;
  },
};

// =============================================================================
// CONTEXTUAL SUGGESTION ACTIONS
// =============================================================================

export const getContextualSuggestionsAction: Action = {
  name: "GET_CONTEXTUAL_SUGGESTIONS",
  similes: ["suggest something", "what should I know", "proactive hint"],
  description: "Get contextual suggestions based on current action and memory.",
  examples: [
    [
      {
        input: { currentAction: "deploy", network: "mainnet" },
        output: {
          suggestions: [
            {
              type: "warning",
              priority: "high",
              title: "Testnet Preference Detected",
              description: "You usually test on testnet before mainnet",
            },
          ],
        },
        explanation: "AI proactively warns about mainnet deployment without testnet testing",
      },
    ],
  ],
  schema: z.object({
    currentAction: z.string().optional().describe("What the user is currently doing"),
    targetAddress: z.string().optional().describe("Address being interacted with"),
    network: z.enum(["mainnet", "testnet"]).optional().describe("Current network"),
    contractAddress: z.string().optional().describe("Contract address involved"),
  }),
  handler: async (_agent: any, input: Record) => {
    const suggestions = await getContextualSuggestions(input);
    return { status: "success", data: { suggestions } };
  },
};

export const checkActionSafetyAction: Action = {
  name: "CHECK_ACTION_SAFETY",
  similes: ["is this safe", "check safety", "verify action", "check risk"],
  description: "Check if an action is safe based on past experiences and memory.",
  examples: [
    [
      {
        input: { type: "send", targetAddress: "0x1234...", network: "mainnet" },
        output: {
          isSafe: false,
          warnings: ["Previous transaction to this address failed"],
          recommendations: ["Investigate the cause of failure before retrying"],
        },
        explanation: "AI checks history and finds a failed transaction to this address",
      },
    ],
  ],
  schema: z.object({
    type: z.enum(["send", "deploy", "interact", "approve"]).describe("Action type"),
    targetAddress: z.string().optional().describe("Address being interacted with"),
    network: z.enum(["mainnet", "testnet"]).describe("Current network"),
    tokenAddress: z.string().optional().describe("Token contract address"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await checkActionSafety(input);
    return { status: "success", data: result };
  },
};

export const getContractMemoryAction: Action = {
  name: "GET_CONTRACT_MEMORY",
  similes: ["contract history", "what do you know about this contract", "contract memory"],
  description: "Get all memory associated with a specific contract address.",
  examples: [
    [
      {
        input: { contractAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1" },
        output: {
          deployed: { name: "MyToken", timestamp: "2026-05-30" },
          interacted: { totalInteractions: 15, functions: ["transfer", "approve"] },
          transactions: [{ status: "success", purpose: "Token deployment" }],
        },
        explanation: "User asks about a contract and AI retrieves all memory about it",
      },
    ],
  ],
  schema: z.object({
    contractAddress: z.string().describe("The contract address to query memory for"),
  }),
  handler: async (_agent: any, input: Record) => {
    const result = await getContractMemory(input.contractAddress);
    return { status: "success", data: result };
  },
};

// =============================================================================
// EXPORT ALL ACTIONS
// =============================================================================

export const realBrainActions = [
  // Authentication
  initializeMemoryAction,
  setupPassphraseAction,
  authenticateAction,
  lockMemoryAction,

  // Memory Operations
  saveMemoryAction,
  savePreferencesAction,
  saveSessionSummaryAction,
  addToWatchlistAction,
  recordTransactionAction,
  addWarningAction,

  // Recall
  queryMemoriesAction,
  getMemorySummaryAction,
  getSessionGreetingAction,

  // Forget
  clearAllMemoriesAction,
  acknowledgeAllWarningsAction,

  // Contextual Suggestions
  getContextualSuggestionsAction,
  checkActionSafetyAction,
  getContractMemoryAction,
];
