/**
 * Real Brain - Contextual Suggestions Engine
 * Actively provides suggestions based on memory context
 */

import { getVault, getAuthStatus } from "./memory-core";
import {
  MemoryQueryResult,
  TransactionRecord,
  Warning,
  WatchlistItem,
  DeployedContract,
  InteractedContract,
} from "../types/memory-types";

// Supported networks
const MAINNET_RPC = "https://rpc.pharos.xyz";
const TESTNET_RPC = "https://atlantic.dplabs-internal.com";

export interface Suggestion {
  type: "warning" | "tip" | "context" | "reminder";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: string;
  relatedAddress?: string;
}

/**
 * Get contextual suggestions based on current context
 */
export async function getContextualSuggestions(context?: {
  currentAction?: string;
  targetAddress?: string;
  network?: "mainnet" | "testnet";
  contractAddress?: string;
}): Promise {
  const suggestions: Suggestion[] = [];

  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return suggestions;
  }

  const vault = getVault();
  if (!vault) {
    return suggestions;
  }

  // Check for warnings
  const unacknowledgedWarnings = vault.warnings.filter((w) => !w.acknowledged);
  for (const warning of unacknowledgedWarnings) {
    suggestions.push({
      type: "warning",
      priority: "high",
      title: `Past Issue: ${warning.type.replace("_", " ")}`,
      description: warning.description,
      relatedAddress: warning.relatedAddress,
      action: "Consider reviewing before proceeding",
    });
  }

  // Context-based suggestions
  if (context?.network === "mainnet" && vault.preferences.preferredNetwork === "testnet") {
    suggestions.push({
      type: "reminder",
      priority: "high",
      title: "Testnet Preference Detected",
      description: `You usually test on testnet before mainnet. Current action is on mainnet.`,
      action: "Would you like to test on testnet first?",
    });
  }

  if (context?.targetAddress) {
    // Check if address is in watchlist
    const watchlistItem = vault.watchlist.find(
      (item) => item.address.toLowerCase() === context.targetAddress?.toLowerCase()
    );
    if (watchlistItem) {
      suggestions.push({
        type: "context",
        priority: "medium",
        title: `Known Address: ${watchlistItem.label}`,
        description: watchlistItem.notes || `Added to watchlist on ${watchlistItem.addedAt}`,
        relatedAddress: context.targetAddress,
      });
    }

    // Check if address was involved in failed transaction
    const failedTx = vault.transactionHistory.find(
      (tx) =>
        tx.status === "failed" &&
        (tx.contract?.toLowerCase() === context.targetAddress?.toLowerCase() ||
          tx.hash.includes(context.targetAddress?.toLowerCase() || ""))
    );
    if (failedTx) {
      suggestions.push({
        type: "warning",
        priority: "high",
        title: "Previous Failed Transaction",
        description: `Transaction to this address failed: ${failedTx.errorReason || "Unknown error"}`,
        relatedAddress: context.targetAddress,
        action: "Proceed with caution or investigate the issue",
      });
    }
  }

  if (context?.contractAddress) {
    // Check if contract was previously deployed
    const deployedContract = vault.onchainMemory.deployedContracts.find(
      (c) => c.address.toLowerCase() === context.contractAddress?.toLowerCase()
    );
    if (deployedContract) {
      suggestions.push({
        type: "context",
        priority: "medium",
        title: `Previously Deployed: ${deployedContract.name}`,
        description: `Deployed on ${deployedContract.network} at ${deployedContract.timestamp}`,
        relatedAddress: context.contractAddress,
      });
    }

    // Check contract interaction history
    const interactedContract = vault.onchainMemory.interactedContracts.find(
      (c) => c.address.toLowerCase() === context.contractAddress?.toLowerCase()
    );
    if (interactedContract) {
      suggestions.push({
        type: "context",
        priority: "low",
        title: `Previous Interactions: ${interactedContract.name}`,
        description: `You've interacted with this contract ${interactedContract.totalInteractions} times. Functions used: ${interactedContract.functions.join(", ")}`,
        relatedAddress: context.contractAddress,
      });
    }

    // Check for testnet-only warning
    const testnetWarning = vault.warnings.find(
      (w) => w.type === "testnet_only" && w.relatedAddress?.toLowerCase() === context.contractAddress?.toLowerCase()
    );
    if (testnetWarning && context.network === "mainnet") {
      suggestions.push({
        type: "warning",
        priority: "high",
        title: "Testnet Only Contract",
        description: testnetWarning.description,
        relatedAddress: context.contractAddress,
        action: "This contract has only been tested on testnet",
      });
    }
  }

  // Check pending tasks
  if (vault.lastSession.tasksPending.length > 0) {
    suggestions.push({
      type: "reminder",
      priority: "medium",
      title: "Pending Tasks from Last Session",
      description: vault.lastSession.tasksPending.join(", "),
    });
  }

  // Check for unreviewed transactions
  const recentFailedTxs = vault.transactionHistory.filter(
    (tx) => tx.status === "failed" && !unacknowledgedWarnings.some((w) => w.relatedAddress === tx.contract)
  );
  if (recentFailedTxs.length > 0 && suggestions.filter((s) => s.type === "warning").length === 0) {
    suggestions.push({
      type: "reminder",
      priority: "low",
      title: "Recent Failed Transactions",
      description: `You have ${recentFailedTxs.length} failed transactions that may need attention`,
    });
  }

  return suggestions;
}

/**
 * Check if action is safe based on memory
 */
export async function checkActionSafety(action: {
  type: "send" | "deploy" | "interact" | "approve";
  targetAddress?: string;
  network: "mainnet" | "testnet";
  tokenAddress?: string;
}): Promise<{
  isSafe: boolean;
  warnings: string[];
  recommendations: string[];
}> {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const auth = getAuthStatus();
  if (!auth.isAuthenticated) {
    return { isSafe: true, warnings: [], recommendations: [] };
  }

  const vault = getVault();
  if (!vault) {
    return { isSafe: true, warnings: [], recommendations: [] };
  }

  // Check network preference
  if (action.network === "mainnet" && vault.preferences.preferredNetwork === "testnet") {
    warnings.push("You typically test on testnet before mainnet");
    recommendations.push("Consider testing on testnet first");
  }

  // Check target address
  if (action.targetAddress) {
    const failedTx = vault.transactionHistory.find(
      (tx) => tx.status === "failed" && tx.contract?.toLowerCase() === action.targetAddress?.toLowerCase()
    );
    if (failedTx) {
      warnings.push(`Previous failed transaction to this address: ${failedTx.e
