/**
 * Real Brain - Memory Operations
 * Save, recall, suggest, and forget operations
 */

import {
  MemoryVault,
  MemoryOperationResult,
  MemoryQueryResult,
  LastSession,
  UserPreferences,
  WatchlistItem,
  TransactionRecord,
  CustomNote,
  Warning,
  OnchainMemory,
  GasRecord,
} from "../types/memory-types";
import { getVault, getAuthStatus } from "./memory-core";

// Error messages for sensitive data detection
const SENSITIVE_PATTERNS = [
  /\b[0-9a-fA-F]{64}\b/, // Private keys (64 hex chars)
  /\b(mnemonic|seed phrase|seed phrase)\b/i,
  /\b(wif|wallet import format)\b/i,
  /\b(secret|private|key)\b.*[=:]\s*\S+/i,
];

// Maximum memory size (10MB)
const MAX_MEMORY_SIZE = 10 * 1024 * 1024;

// ============================================================================
// SAVE OPERATIONS
// ============================================================================

/**
 * Save a memory with automatic categorization
 */
export async function saveMemory(content: string, category?: string): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  // Check for sensitive data
  if (containsSensitiveData(content)) {
    return {
      success: false,
      message:
        "I cannot save that information. For your security, I don't store private keys, seed phrases, or other sensitive credentials.",
    };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const note: CustomNote = {
    id: generateId(),
    content,
    category: category || "general",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  vault.customNotes.push(note);

  return {
    success: true,
    message: `Memory saved to ${note.category} category`,
    data: { noteId: note.id },
  };
}

/**
 * Save user preferences
 */
export async function savePreferences(preferences: Partial): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  vault.preferences = {
    ...vault.preferences,
    ...preferences,
  };

  return {
    success: true,
    message: "Preferences updated",
    data: { preferences: vault.preferences },
  };
}

/**
 * Save last session summary
 */
export async function saveSessionSummary(
  summary: string,
  tasksCompleted: string[],
  tasksPending: string[],
  network: "mainnet" | "testnet"
): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  vault.lastSession = {
    summary,
    timestamp: new Date().toISOString(),
    tasksCompleted,
    tasksPending,
    networkUsed: network,
  };

  return {
    success: true,
    message: "Session summary saved",
    data: { session: vault.lastSession },
  };
}

/**
 * Add item to watchlist
 */
export async function addToWatchlist(
  address: string,
  type: "token" | "contract" | "wallet",
  label: string,
  notes?: string
): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  // Basic address validation
  if (!isValidAddress(address)) {
    return { success: false, message: "Invalid address format" };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  // Check if already exists
  const existing = vault.watchlist.find((item) => item.address.toLowerCase() === address.toLowerCase());
  if (existing) {
    return {
      success: false,
      message: `Address already in watchlist as "${existing.label}"`,
    };
  }

  const item: WatchlistItem = {
    address,
    type,
    label,
    notes: notes || "",
    addedAt: new Date().toISOString(),
  };

  vault.watchlist.push(item);

  return {
    success: true,
    message: `Added ${label} to watchlist`,
    data: { item },
  };
}

/**
 * Record a transaction
 */
export async function recordTransaction(
  hash: string,
  purpose: string,
  network: "mainnet" | "testnet",
  status: "success" | "failed" | "pending",
  errorReason?: string,
  contract?: string,
  tokenAmount?: string
): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const tx: TransactionRecord = {
    hash,
    timestamp: new Date().toISOString(),
    purpose,
    network,
    status,
    errorReason,
    contract,
    tokenAmount,
  };

  vault.transactionHistory.push(tx);

  // If failed, create a warning
  if (status === "failed") {
    const warning: Warning = {
      id: generateId(),
      type: "failed_tx",
      description: `Transaction failed: ${purpose}`,
      relatedAddress: contract,
      createdAt: new Date().toISOString(),
      acknowledged: false,
    };
    vault.warnings.push(warning);
  }

  return {
    success: true,
    message: `Transaction recorded: ${status}`,
    data: { transaction: tx },
  };
}

/**
 * Add a warning
 */
export async function addWarning(
  type: "failed_tx" | "contract_error" | "security" | "testnet_only",
  description: string,
  relatedAddress?: string
): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const warning: Warning = {
    id: generateId(),
    type,
    description,
    relatedAddress,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };

  vault.warnings.push(warning);

  return {
    success: true,
    message: "Warning added",
    data: { warning },
  };
}

/**
 * Save gas price for future reference
 */
export async function saveGasPrice(
  network: string,
  gasPrice: string,
  priorityFee: string,
  baseFee: string
): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const record: GasRecord = {
    timestamp: new Date().toISOString(),
    network,
    gasPrice,
    priorityFee,
    baseFee,
  };

  vault.onchainMemory.gasHistory.push(record);

  // Keep only last 100 gas records
  if (vault.onchainMemory.gasHistory.length > 100) {
    vault.onchainMemory.gasHistory = vault.onchainMemory.gasHistory.slice(-100);
  }

  return {
    success: true,
    message: "Gas price recorded",
  };
}

/**
 * Save contract interaction
 */
export async function saveContractInteraction(
  address: string,
  name: string,
  functionName?: string
): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const existing = vault.onchainMemory.interactedContracts.find(
    (c) => c.address.toLowerCase() === address.toLowerCase()
  );

  if (existing) {
    existing.lastInteraction = new Date().toISOString();
    existing.totalInteractions++;
    if (functionName && !existing.functions.includes(functionName)) {
      existing.functions.push(functionName);
    }
  } else {
    vault.onchainMemory.interactedContracts.push({
      address,
      name,
      lastInteraction: new Date().toISOString(),
      totalInteractions: 1,
      functions: functionName ? [functionName] : [],
    });
  }

  return {
    success: true,
    message: `Contract interaction saved: ${name}`,
  };
}

// ============================================================================
// RECALL OPERATIONS
// ============================================================================

/**
 * Query memories with context
 */
export async function queryMemories(query: string): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return {
      relevantMemories: [],
      suggestions: [],
      warnings: [],
      context: "Memory vault is locked. Please authenticate to access memories.",
    };
  }

  const vault = getVault();
  if (!vault) {
    return {
      relevantMemories: [],
      suggestions: [],
      warnings: [],
      context: "Memory vault not accessible",
    };
  }

  const relevantMemories: any[] = [];
  const suggestions: string[] = [];
  const warnings: string[] = [];
  let context = "";

  // Search custom notes
  const matchingNotes = vault.customNotes.filter(
    (note) =>
      note.content.toLowerCase().includes(query.toLowerCase()) ||
      note.category.toLowerCase().includes(query.toLowerCase())
  );
  relevantMemories.push(...matchingNotes.map((n) => ({ type: "note", ...n })));

  // Search watchlist
  const matchingWatchlist = vault.watchlist.filter(
    (item) =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.address.toLowerCase().includes(query.toLowerCase()) ||
      item.notes.toLowerCase().includes(query.toLowerCase())
  );
  relevantMemories.push(...matchingWatchlist.map((w) => ({ type: "watchlist", ...w })));

  // Search transaction history
  const matchingTxs = vault.transactionHistory.filter(
    (tx) =>
      tx.purpose.toLowerCase().includes(query.toLowerCase()) ||
      tx.hash.toLowerCase().includes(query.toLowerCase())
  );
  relevantMemories.push(...matchingTxs.map((t) => ({ type: "transaction", ...t })));

  // Generate suggestions based on context
  if (query.toLowerCase().includes("wallet")) {
    if (vault.userIdentity.preferredWallet) {
      suggestions.push(`Your preferred wallet is ${vault.userIdentity.preferredWallet}`);
    }
    if (vault.userIdentity.walletAddresses.length > 0) {
      suggestions.push(`You have ${vault.userIdentity.walletAddresses.length} wallet addresses on file`);
    }
  }

  if (query.toLowerCase().includes("gas")) {
    const lastGas = vault.onchainMemory.gasHistory[vault.onchainMemory.gasHistory.length - 1];
    if (lastGas) {
      suggestions.push(`Last recorded gas: ${lastGas.gasPrice}`);
    }
  }

  // Get unacknowledged warnings
  const unacknowledgedWarnings = vault.warnings.filter((w) => !w.acknowledged);
  warnings.push(...unacknowledgedWarnings.map((w) => w.description));

  // Build context summary
  if (vault.lastSession.summary) {
    context = `Last session (${vault.lastSession.timestamp}): ${vault.lastSession.summary}`;
    if (vault.lastSession.tasksPending.length > 0) {
      context += `\nPending tasks: ${vault.lastSession.tasksPending.join(", ")}`;
    }
  }

  return {
    relevantMemories,
    suggestions,
    warnings,
    context,
  };
}

/**
 * Get all memories (summary)
 */
export async function getAllMemoriesSummary(): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  return {
    success: true,
    message: "Memory summary retrieved",
    data: {
      lastSession: vault.lastSession,
      preferences: vault.preferences,
      watchlistCount: vault.watchlist.length,
      transactionCount: vault.transactionHistory.length,
      notesCount: vault.customNotes.length,
      warningsCount: vault.warnings.filter((w) => !w.acknowledged).length,
      contractsInteracted: vault.onchainMemory.interactedContracts.length,
      deployedContracts: vault.onchainMemory.deployedContracts.length,
    },
  };
}

/**
 * Get unacknowledged warnings
 */
export async function getWarnings(): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return [];
  }

  const vault = getVault();
  if (!vault) {
    return [];
  }

  return vault.warnings.filter((w) => !w.acknowledged);
}

/**
 * Get recent transactions
 */
export async function getRecentTransactions(limit: number = 10): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return [];
  }

  const vault = getVault();
  if (!vault) {
    return [];
  }

  return vault.transactionHistory.slice(-limit).reverse();
}

// ============================================================================
// FORGET OPERATIONS
// ============================================================================

/**
 * Delete specific memory
 */
export async function deleteMemory(noteId: string): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const index = vault.customNotes.findIndex((note) => note.id === noteId);
  if (index === -1) {
    return { success: false, message: "Memory not found" };
  }

  vault.customNotes.splice(index, 1);

  return {
    success: true,
    message: "Memory deleted",
  };
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(address: string): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const index = vault.watchlist.findIndex((item) => item.address.toLowerCase() === address.toLowerCase());
  if (index === -1) {
    return { success: false, message: "Address not in watchlist" };
  }

  vault.watchlist.splice(index, 1);

  return {
    success: true,
    message: "Removed from watchlist",
  };
}

/**
 * Acknowledge a warning
 */
export async function acknowledgeWarning(warningId: string): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  const warning = vault.warnings.find((w) => w.id === warningId);
  if (!warning) {
    return { success: false, message: "Warning not found" };
  }

  warning.acknowledged = true;

  return {
    success: true,
    message: "Warning acknowledged",
  };
}

/**
 * Clear all memories (factory reset)
 */
export async function clearAllMemories(): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  // Keep user identity but clear all other data
  vault.lastSession = {
    summary: "",
    timestamp: "",
    tasksCompleted: [],
    tasksPending: [],
    networkUsed: "testnet",
  };
  vault.watchlist = [];
  vault.transactionHistory = [];
  vault.customNotes = [];
  vault.warnings = [];
  vault.onchainMemory = {
    deployedContracts: [],
    interactedContracts: [],
    contractABIs: [],
    tokenBalances: [],
    tokenTransfers: [],
    gasHistory: [],
    averageGasPrices: [],
  };

  return {
    success: true,
    message: "All memories cleared. User identity preserved.",
  };
}

/**
 * Acknowledge all warnings
 */
export async function acknowledgeAllWarnings(): Promise {
  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { success: false, message: "Memory vault is locked. Please authenticate first." };
  }

  const vault = getVault();
  if (!vault) {
    return { success: false, message: "Memory vault not accessible" };
  }

  vault.warnings.forEach((w) => {
    w.acknowledged = true;
  });

  return {
    success: true,
    message: `Acknowledged ${vault.warnings.length} warnings`,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if content contains sensitive data
 */
function containsSensitiveData(content: string): boolean {
  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(content)) {
      return true;
    }
  }
  return false;
}

/**
 * Validate Ethereum address
 */
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
