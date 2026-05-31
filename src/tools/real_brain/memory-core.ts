/**
 * Real Brain Core - Memory Storage Engine
 * Handles all memory operations with passphrase authentication
 */

import {
  MemoryVault,
  SessionContext,
  PassphraseHash,
  SecuritySettings,
  MemoryOperationResult,
  MemoryQueryResult,
} from "../types/memory-types";

// In-memory storage (would be file system in production)
let memoryVault: MemoryVault | null = null;
let sessionContext: SessionContext = {
  isAuthenticated: false,
  failedAttempts: 0,
  lastActivity: new Date().toISOString(),
};

// Security constants
const MAX_FAILED_ATTEMPTS = 5;
const SALT_LENGTH = 32;
const HASH_ITERATIONS = 100000;

// Default security settings
const DEFAULT_SECURITY: SecuritySettings = {
  autoLockMinutes: 30,
  maxFailedAttempts: MAX_FAILED_ATTEMPTS,
  requireAuthOnStartup: true,
};

// Initialize or load memory vault
export async function initializeMemory(storagePath?: string): Promise {
  try {
    if (memoryVault) {
      return {
        success: true,
        message: "Memory vault already initialized",
        data: { isAuthenticated: sessionContext.isAuthenticated },
      };
    }

    // In production, this would load from file system
    memoryVault = createEmptyVault();
    sessionContext.isAuthenticated = false;
    sessionContext.failedAttempts = 0;

    return {
      success: true,
      message: "Memory vault initialized",
      data: { isAuthenticated: false },
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to initialize memory: ${error.message}`,
    };
  }
}

// Create empty vault structure
function createEmptyVault(): MemoryVault {
  return {
    version: "1.0.0",
    userIdentity: {
      walletAddresses: [],
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    },
    lastSession: {
      summary: "",
      timestamp: "",
      tasksCompleted: [],
      tasksPending: [],
      networkUsed: "testnet",
    },
    preferences: {
      preferredNetwork: "testnet",
      gasSettings: {},
      tokenPairs: [],
      workflowPreferences: [],
    },
    watchlist: [],
    transactionHistory: [],
    customNotes: [],
    warnings: [],
    onchainMemory: {
      deployedContracts: [],
      interactedContracts: [],
      contractABIs: [],
      tokenBalances: [],
      tokenTransfers: [],
      gasHistory: [],
      averageGasPrices: [],
    },
    security: DEFAULT_SECURITY,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Hash passphrase with salt
async function hashPassphrase(passphrase: string, salt?: string): Promise {
  const actualSalt = salt || generateRandomString(SALT_LENGTH);
  const combined = passphrase + actualSalt;
  const hash = await simpleHash(combined.repeat(HASH_ITERATIONS));

  return {
    hash,
    salt: actualSalt,
    createdAt: new Date().toISOString(),
  };
}

// Simple hash function (for demo - use proper crypto in production)
async function simpleHash(input: string): Promise {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

// Generate random string
function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Verify passphrase
async function verifyPassphrase(passphrase: string, storedHash: PassphraseHash): Promise {
  const hash = await simpleHash(passphrase + storedHash.salt + "".repeat(HASH_ITERATIONS));
  return hash === storedHash.hash;
}

// Set up new passphrase (first time setup)
export async function setupPassphrase(passphrase: string): Promise {
  if (!memoryVault) {
    return { success: false, message: "Memory vault not initialized" };
  }

  if (passphrase.length < 8) {
    return { success: false, message: "Passphrase must be at least 8 characters" };
  }

  const passphraseHash = await hashPassphrase(passphrase);

  memoryVault.security = { ...memoryVault.security };

  sessionContext.isAuthenticated = true;
  sessionContext.failedAttempts = 0;
  sessionContext.passphraseHash = passphraseHash.hash;
  sessionContext.lastActivity = new Date().toISOString();

  await saveVault();

  return {
    success: true,
    message: "Passphrase set up successfully",
  };
}

// Authenticate with passphrase
export async function authenticate(passphrase: string): Promise {
  if (!memoryVault) {
    return { success: false, message: "Memory vault not initialized" };
  }

  if (!sessionContext.passphraseHash) {
    return { success: false, message: "No passphrase set up. Please set up a passphrase first." };
  }

  if (sessionContext.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    return {
      success: false,
      message: "Too many failed attempts. Memory vault locked. Please restart session.",
    };
  }

  const storedHash: PassphraseHash = {
    hash: sessionContext.passphraseHash,
    salt: "",
    createdAt: new Date().toISOString(),
  };

  const isValid = await verifyPassphrase(passphrase, storedHash);

  if (isValid) {
    sessionContext.isAuthenticated = true;
    sessionContext.failedAttempts = 0;
    sessionContext.lastActivity = new Date().toISOString();
    memoryVault.userIdentity.lastActive = new Date().toISOString();

    await saveVault();

    return {
      success: true,
      message: "Authentication successful",
      data: {
        lastSession: memoryVault.lastSession,
        preferences: memoryVault.preferences,
      },
    };
  } else {
    sessionContext.failedAttempts++;
    sessionContext.lastActivity = new Date().toISOString();

    const remainingAttempts = MAX_FAILED_ATTEMPTS - sessionContext.failedAttempts;

    return {
      success: false,
      message: `Invalid passphrase. ${remainingAttempts} attempts remaining before lockout.`,
    };
  }
}

// Lock the memory vault
export function lockVault(): MemoryOperationResult {
  sessionContext.isAuthenticated = false;
  return { success: true, message: "Memory vault locked" };
}

// Check authentication status
export function getAuthStatus(): { isAuthenticated: boolean; failedAttempts: number } {
  return {
    isAuthenticated: sessionContext.isAuthenticated,
    failedAttempts: sessionContext.failedAttempts,
  };
}

// Change passphrase
export async function changePassphrase(
  currentPassphrase: string,
  newPassphrase: string
): Promise {
  if (!memoryVault || !sessionContext.isAuthenticated) {
    return { success: false, message: "Not authenticated" };
  }

  const authResult = await authenticate(currentPassphrase);
  if (!authResult.success) {
    return authResult;
  }

  if (newPassphrase.length < 8) {
    return { success: false, message: "New passphrase must be at least 8 characters" };
  }

  return await setupPassphrase(newPassphrase);
}

// Save vault to storage
async function saveVault(): Promise {
  if (!memoryVault) return;
  memoryVault.updatedAt = new Date().toISOString();
}

// Load vault from storage
async function loadVault(): Promise {
  // In production, load from file system
}

// Get the current memory vault (only if authenticated)
export function getVault(): MemoryVault | null {
  if (!sessionContext.isAuthenticated) {
    return null;
  }
  return memoryVault;
}

// Export session context
export function getSessionContext(): SessionContext {
  return { ...sessionContext };
}
