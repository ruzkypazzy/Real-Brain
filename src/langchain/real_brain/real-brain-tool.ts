/**
 * Real Brain LangChain Tool
 * Makes memory functionality accessible to AI agents
 */

import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  initializeMemory,
  setupPassphrase,
  authenticate,
  lockVault,
  changePassphrase,
  getAuthStatus,
} from "../../tools/real_brain/memory-core";
import {
  saveMemory,
  savePreferences,
  saveSessionSummary,
  addToWatchlist,
  recordTransaction,
  addWarning,
  saveGasPrice,
  saveContractInteraction,
  queryMemories,
  getAllMemoriesSummary,
  getWarnings,
  getRecentTransactions,
  deleteMemory,
  removeFromWatchlist,
  acknowledgeWarning,
  clearAllMemories,
  acknowledgeAllWarnings,
} from "../../tools/real_brain/memory-operations";
import {
  getContextualSuggestions,
  checkActionSafety,
  generateSessionGreeting,
  getSmartReminders,
  getContractMemory,
} from "../../tools/real_brain/contextual-suggestions";

// =============================================================================
// INITIALIZATION TOOLS
// =============================================================================

export class InitializeMemoryTool extends Tool {
  name = "initialize_memory";
  description = `Initialize the Real Brain memory system. This must be called before any other memory operations.
  Returns the authentication status and memory vault state.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const result = await initializeMemory();
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class SetupPassphraseTool extends Tool {
  name = "setup_passphrase";
  description = `Set up a new passphrase for the memory vault. This is required on first use.
  Inputs (JSON string):
    - passphrase: string, your chosen passphrase (minimum 8 characters)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.passphrase) {
        return JSON.stringify({ success: false, message: "Passphrase is required" });
      }
      const result = await setupPassphrase(parsed.passphrase);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class AuthenticateTool extends Tool {
  name = "authenticate";
  description = `Authenticate with passphrase to unlock the memory vault.
  Inputs (JSON string):
    - passphrase: string, your passphrase
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.passphrase) {
        return JSON.stringify({ success: false, message: "Passphrase is required" });
      }
      const result = await authenticate(parsed.passphrase);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class LockMemoryTool extends Tool {
  name = "lock_memory";
  description = `Lock the memory vault. Requires re-authentication to access memories again.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const result = lockVault();
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class ChangePassphraseTool extends Tool {
  name = "change_passphrase";
  description = `Change your memory vault passphrase. Requires current passphrase verification.
  Inputs (JSON string):
    - currentPassphrase: string, your current passphrase
    - newPassphrase: string, your new passphrase (minimum 8 characters)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.currentPassphrase || !parsed.newPassphrase) {
        return JSON.stringify({ success: false, message: "Both current and new passphrase required" });
      }
      const result = await changePassphrase(parsed.currentPassphrase, parsed.newPassphrase);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

// =============================================================================
// SAVE TOOLS
// =============================================================================

export class SaveMemoryTool extends Tool {
  name = "save_memory";
  description = `Save a memory or note for the user. The AI agent should automatically categorize the content.
  Inputs (JSON string):
    - content: string, what to remember (required)
    - category: string, optional category hint (e.g., "wallet", "preference", "project")
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.content) {
        return JSON.stringify({ success: false, message: "Content is required" });
      }
      const result = await saveMemory(parsed.content, parsed.category);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class SavePreferencesTool extends Tool {
  name = "save_preferences";
  description = `Save user preferences for future reference.
  Inputs (JSON string):
    - preferredNetwork: string, "mainnet" or "testnet" (optional)
    - maxGasPrice: string, maximum gas price willing to pay (optional)
    - tokenPairs: array of strings, preferred token pairs (optional)
    - workflowPreferences: array of strings, workflow preferences (optional)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      const result = await savePreferences(parsed);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class SaveSessionSummaryTool extends Tool {
  name = "save_session_summary";
  description = `Save a summary of the current session for continuity in future sessions.
  Inputs (JSON string):
    - summary: string, what was accomplished (required)
    - tasksCompleted: array of strings, completed tasks (required)
    - tasksPending: array of strings, tasks still pending (required)
    - network: string, "mainnet" or "testnet" (required)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.summary || !parsed.tasksCompleted || !parsed.tasksPending || !parsed.network) {
        return JSON.stringify({ success: false, message: "All fields are required" });
      }
      const result = await saveSessionSummary(
        parsed.summary,
        parsed.tasksCompleted,
        parsed.tasksPending,
        parsed.network
      );
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class AddToWatchlistTool extends Tool {
  name = "add_to_watchlist";
  description = `Add a wallet address, token, or contract to the watchlist.
  Inputs (JSON string):
    - address: string, the address to watch (required)
    - type: string, "token", "contract", or "wallet" (required)
    - label: string, a friendly name for this address (required)
    - notes: string, additional notes (optional)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.address || !parsed.type || !parsed.label) {
        return JSON.stringify({ success: false, message: "Address, type, and label are required" });
      }
      const result = await addToWatchlist(parsed.address, parsed.type, parsed.label, parsed.notes);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class RecordTransactionTool extends Tool {
  name = "record_transaction";
  description = `Record a transaction for future reference and learning.
  Inputs (JSON string):
    - hash: string, transaction hash (required)
    - purpose: string, what the transaction was for (required)
    - network: string, "mainnet" or "testnet" (required)
    - status: string, "success", "failed", or "pending" (required)
    - errorReason: string, reason for failure if applicable (optional)
    - contract: string, contract address involved (optional)
    - tokenAmount: string, amount transferred (optional)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.hash || !parsed.purpose || !parsed.network || !parsed.status) {
        return JSON.stringify({ success: false, message: "hash, purpose, network, and status are required" });
      }
      const result = await recordTransaction(
        parsed.hash,
        parsed.purpose,
        parsed.network,
        parsed.status,
        parsed.errorReason,
        parsed.contract,
        parsed.tokenAmount
      );
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class AddWarningTool extends Tool {
  name = "add_warning";
  description = `Add a warning or lesson learned for future reference.
  Inputs (JSON string):
    - type: string, "failed_tx", "contract_error", "security", or "testnet_only" (required)
    - description: string, what happened (required)
    - relatedAddress: string, related contract/address (optional)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.type || !parsed.description) {
        return JSON.stringify({ success: false, message: "Type and description are required" });
      }
      const result = await addWarning(parsed.type, parsed.description, parsed.relatedAddress);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class SaveGasPriceTool extends Tool {
  name = "save_gas_price";
  description = `Record current gas prices for future reference.
  Inputs (JSON string):
    - network: string, "mainnet" or "testnet" (required)
    - gasPrice: string, current gas price in wei (required)
    - priorityFee: string, priority fee in wei (required)
    - baseFee: string, base fee in wei (required)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.network || !parsed.gasPrice || !parsed.priorityFee || !parsed.baseFee) {
        return JSON.stringify({ success: false, message: "All fields are required" });
      }
      const result = await saveGasPrice(parsed.network, parsed.gasPrice, parsed.priorityFee, parsed.baseFee);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class SaveContractInteractionTool extends Tool {
  name = "save_contract_interaction";
  description = `Record a contract interaction for future reference.
  Inputs (JSON string):
    - address: string, contract address (required)
    - name: string, contract name/label (required)
    - functionName: string, function that was called (optional)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.address || !parsed.name) {
        return JSON.stringify({ success: false, message: "Address and name are required" });
      }
      const result = await saveContractInteraction(parsed.address, parsed.name, parsed.functionName);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

// =============================================================================
// RECALL TOOLS
// =============================================================================

export class QueryMemoriesTool extends Tool {
  name = "query_memories";
  description = `Search through all memories and retrieve relevant information.
  Inputs (JSON string):
    - query: string, search query (required)
  Returns relevant memories, suggestions, warnings, and session context.
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.query) {
        return JSON.stringify({ success: false, message: "Query is required" });
      }
      const result = await queryMemories(parsed.query);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class GetMemorySummaryTool extends Tool {
  name = "get_memory_summary";
  description = `Get a summary of all stored memories including counts and categories.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const result = await getAllMemoriesSummary();
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class GetWarningsTool extends Tool {
  name = "get_warnings";
  description = `Get all unacknowledged warnings and lessons learned.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const warnings = await getWarnings();
      return JSON.stringify({ success: true, data: warnings });
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class GetRecentTransactionsTool extends Tool {
  name = "get_recent_transactions";
  description = `Get recent transaction history.
  Inputs (JSON string):
    - limit: number, maximum number of transactions to return (optional, default 10)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      const limit = parsed.limit || 10;
      const transactions = await getRecentTransactions(limit);
      return JSON.stringify({ success: true, data: transactions });
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

// =============================================================================
// FORGET TOOLS
// =============================================================================

export class DeleteMemoryTool extends Tool {
  name = "delete_memory";
  description = `Delete a specific memory by ID.
  Inputs (JSON string):
    - noteId: string, the ID of the memory to delete (required)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.noteId) {
        return JSON.stringify({ success: false, message: "Note ID is required" });
      }
      const result = await deleteMemory(parsed.noteId);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class RemoveFromWatchlistTool extends Tool {
  name = "remove_from_watchlist";
  description = `Remove an address from the watchlist.
  Inputs (JSON string):
    - address: string, the address to remove (required)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.address) {
        return JSON.stringify({ success: false, message: "Address is required" });
      }
      const result = await removeFromWatchlist(parsed.address);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class AcknowledgeWarningTool extends Tool {
  name = "acknowledge_warning";
  description = `Acknowledge a warning to mark it as reviewed.
  Inputs (JSON string):
    - warningId: string, the ID of the warning to acknowledge (required)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.warningId) {
        return JSON.stringify({ success: false, message: "Warning ID is required" });
      }
      const result = await acknowledgeWarning(parsed.warningId);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class ClearAllMemoriesTool extends Tool {
  name = "clear_all_memories";
  description = `Clear all memories except user identity. Use this when user wants a fresh start.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const result = await clearAllMemories();
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class AcknowledgeAllWarningsTool extends Tool {
  name = "acknowledge_all_warnings";
  description = `Acknowledge all warnings at once.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const result = await acknowledgeAllWarnings();
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

// =============================================================================
// CONTEXTUAL SUGGESTION TOOLS
// =============================================================================

export class GetContextualSuggestionsTool extends Tool {
  name = "get_contextual_suggestions";
  description = `Get contextual suggestions based on current action and memory.
  Inputs (JSON string):
    - currentAction: string, what the user is currently doing (optional)
    - targetAddress: string, address being interacted with (optional)
    - network: string, "mainnet" or "testnet" (optional)
    - contractAddress: string, contract address involved (optional)
  Returns proactive suggestions, warnings, and reminders based on memory.
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      const context = parsed;
      const suggestions = await getContextualSuggestions(context);
      return JSON.stringify({ success: true, data: suggestions });
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class CheckActionSafetyTool extends Tool {
  name = "check_action_safety";
  description = `Check if an action is safe based on past experiences and memory.
  Inputs (JSON string):
    - type: string, "send", "deploy", "interact", or "approve" (required)
    - targetAddress: string, address being interacted with (optional)
    - network: string, "mainnet" or "testnet" (required)
    - tokenAddress: string, token contract address (optional)
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.type || !parsed.network) {
        return JSON.stringify({ success: false, message: "Type and network are required" });
      }
      const result = await checkActionSafety(parsed);
      return JSON.stringify(result);
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class GetSessionGreetingTool extends Tool {
  name = "get_session_greeting";
  description = `Generate a personalized greeting for the user based on their session history. Use this at the start of every session.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const greeting = await generateSessionGreeting();
      return JSON.stringify({ success: true, data: { greeting } });
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class GetSmartRemindersTool extends Tool {
  name = "get_smart_reminders";
  description = `Get smart reminders based on time and memory patterns.`;

  constructor() {
    super();
  }

  protected async _call(_input: string): Promise {
    try {
      const reminders = await getSmartReminders();
      return JSON.stringify({ success: true, data: reminders });
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

export class GetContractMemoryTool extends Tool {
  name = "get_contract_memory";
  description = `Get all memory associated with a specific contract address.
  Inputs (JSON string):
    - contractAddress: string, the contract address (required)
  Returns deployment info, interaction history, and past transactions.
  `;

  constructor() {
    super();
  }

  protected async _call(input: string): Promise {
    try {
      const parsed = JSON.parse(input);
      if (!parsed.contractAddress) {
        return JSON.stringify({ success: false, message: "Contract address is required" });
      }
      const result = await getContractMemory(parsed.contractAddress);
      return JSON.stringify({ success: true, data: result });
    } catch (error: any) {
      return JSON.stringify({ success: false, message: error.message });
    }
  }
}

// =============================================================================
// TOOL FACTORY
// =============================================================================

export function createRealBrainTools() {
  return [
    // Initialization
    new InitializeMemoryTool(),
    new SetupPassphraseTool(),
    new AuthenticateTool(),
    new LockMemoryTool(),
    new ChangePassphraseTool(),

    // Save operations
    new SaveMemoryTool(),
    new SavePreferencesTool(),
    new SaveSessionSummaryTool(),
    new AddToWatchlistTool(),
    new RecordTransactionTool(),
    new AddWarningTool(),
    new SaveGasPriceTool(),
    new SaveContractInteractionTool(),

    // Recall operations
    new QueryMemoriesTool(),
    new GetMemorySummaryTool(),
    new GetWarningsTool(),
    new GetRecentTransactionsTool(),

    // Forget operations
    new DeleteMemoryTool(),
    new RemoveFromWatchlistTool(),
    new AcknowledgeWarningTool(),
    new ClearAllMemoriesTool(),
    new AcknowledgeAllWarningsTool(),

    // Contextual suggestions
    new GetContextualSuggestionsTool(),
    new CheckActionSafetyTool(),
    new GetSessionGreetingTool(),
    new GetSmartRemindersTool(),
    new GetContractMemoryTool(),
  ];
}
