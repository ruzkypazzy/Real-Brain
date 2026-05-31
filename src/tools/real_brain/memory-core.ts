/**
 * Real Brain Core - Memory Storage Engine
 * Handles all memory operations with device-based passphrase authentication
 */

import {
  MemoryVault,
  SessionContext,
  PassphraseHash,
  SecuritySettings,
  MemoryOperationResult,
} from "../types/memory-types";

// Storage keys for localStorage persistence
const STORAGE_KEY = 'realbrain_vault';
const DEVICE_ID_KEY = 'realbrain_device_id';
const SALT_KEY = 'realbrain_salt';  // NEW: Separate key for salt

// In-memory storage (synced with localStorage)
let memoryVault: MemoryVault | null = null;
let sessionContext: SessionContext = {
  isAuthenticated: false,
  failedAttempts: 0,
  lastActivity: new Date().toISOString(),
  passphraseHash: undefined,
};

// Extend SessionContext to include saltHash (internal property)
interface ExtendedSessionContext extends SessionContext {
  saltHash?: string;
}

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

// ============================================================================
// DEVICE ID MANAGEMENT - Ensures each device has its own vault
// ============================================================================

/**
 * Get or create a unique device ID
 * This ensures that each browser/device gets its own vault
 */
function getDeviceId(): string {
  // Check if we're in a browser environment
  if (typeof localStorage === 'undefined') {
    // Node.js environment - generate a session ID
    return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// ============================================================================
// LOCALSTORAGE PERSISTENCE - Vault persists across sessions
// ============================================================================

interface StoredVault {
  deviceId: string;
  passphraseHash: string | null;
  saltHash: string | null;  // NEW: Store the salt hash for verification
  memoryVault: MemoryVault;
  createdAt: string;
  lastAccess: string;
}

/**
 * Save vault to localStorage
 * This ensures persistence across browser sessions
 */
function persistVault(): void {
  if (!memoryVault || typeof localStorage === 'undefined') return;

  const deviceId = getDeviceId();
  const storedVault: StoredVault = {
    deviceId,
    passphraseHash: sessionContext.passphraseHash || null,
    saltHash: (sessionContext as ExtendedSessionContext).saltHash || null,  // Save the salt hash
    memoryVault,
    createdAt: memoryVault.createdAt,
    lastAccess: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(storedVault));
}

/**
 * Load vault from localStorage
 * Returns null if no vault exists for this device
 */
function retrieveVault(): StoredVault | null {
  if (typeof localStorage === 'undefined') return null;

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize or load memory vault
export async function initializeMemory(storagePath?: string): Promise {
  try {
    // Load existing vault for this device
    const storedVault = retrieveVault();
    const currentDeviceId = getDeviceId();

    if (storedVault && storedVault.deviceId === currentDeviceId) {
      // This device has a vault - restore it
      memoryVault = storedVault.memoryVault;
      sessionContext.passphraseHash = storedVault.passphraseHash || undefined;
      (sessionContext as ExtendedSessionContext).saltHash = storedVault.saltHash || undefined;
      sessionContext.isAuthenticated = false;
      sessionContext.failedAttempts = 0;

      return {
        success: true,
        message: "Memory vault restored for this device",
        data: {
          isAuthenticated: false,
          hasExistingVault: !!storedVault.passphraseHash
        },
      };
    }

    // New device or no vault - create empty vault
    memoryVault = createEmptyVault();
    sessionContext.isAuthenticated = false;
    sessionContext.failedAttempts = 0;
    sessionContext.passphraseHash = undefined;
    (sessionContext as ExtendedSessionContext).saltHash = undefined;

    return {
      success: true,
      message: "New vault created for this device",
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

// ============================================================================
// PASSPHRASE HASHING - Device-specific for multi-user safety
// ============================================================================

/**
 * Hash passphrase with device ID
 * This ensures that the same passphrase gives different hashes on different devices
 */
async function hashPassphrase(passphrase: string, salt?: string): Promise {
  const deviceId = getDeviceId();
  const actualSalt = salt || (deviceId + '_' + generateRandomString(SALT_LENGTH));
  const combined = passphrase + actualSalt + '_device_bound';
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
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize or load memory vault
export async function initializeMemory(storagePath?: string): Promise {
  try {
    // Load existing vault for this device
    const storedVault = retrieveVault();
    const currentDeviceId = getDeviceId();

    if (storedVault && storedVault.deviceId === currentDeviceId) {
      // This device has a vault - restore it
      memoryVault = storedVault.memoryVault;
      sessionContext.passphraseHash = storedVault.passphraseHash || undefined;
      (sessionContext as ExtendedSessionContext).saltHash = storedVault.saltHash || undefined;
      sessionContext.isAuthenticated = false;
      sessionContext.failedAttempts = 0;

      return {
        success: true,
        message: "Memory vault restored for this device",
        data: {
          isAuthenticated: false,
          hasExistingVault: !!storedVault.passphraseHash
        },
      };
    }

    // New device or no vault - create empty vault
    memoryVault = createEmptyVault();
    sessionContext.isAuthenticated = false;
    sessionContext.failedAttempts = 0;
    sessionContext.passphraseHash = undefined;
    (sessionContext as ExtendedSessionContext).saltHash = undefined;

    return {
      success: true,
      message: "New vault created for this device",
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

// ============================================================================
// PASSPHRASE HASHING - Device-specific for multi-user safety
// ============================================================================

/**
 * Hash passphrase with device ID
 * This ensures that the same passphrase gives different hashes on different devices
 */
async function hashPassphrase(passphrase: string, salt?: string): Promise {
  const deviceId = getDeviceId();
  const actualSalt = salt || (deviceId + '_' + generateRandomString(SALT_LENGTH));
  const combined = passphrase + actualSalt + '_device_bound';
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
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize or load memory vault
export async function initializeMemory(storagePath?: string): Promise {
  try {
    // Load existing vault for this device
    const storedVault = retrieveVault();
    const currentDeviceId = getDeviceId();

    if (storedVault && storedVault.deviceId === currentDeviceId) {
      // This device has a vault - restore it
      memoryVault = storedVault.memoryVault;
      sessionContext.passphraseHash = storedVault.passphraseHash || undefined;
      (sessionContext as ExtendedSessionContext).saltHash = storedVault.saltHash || undefined;
      sessionContext.isAuthenticated = false;
      sessionContext.failedAttempts = 0;

      return {
        success: true,
        message: "Memory vault restored for this device",
        data: {
          isAuthenticated: false,
          hasExistingVault: !!storedVault.passphraseHash
        },
      };
    }

    // New device or no vault - create empty vault
    memoryVault = createEmptyVault();
    sessionContext.isAuthenticated = false;
    sessionContext.failedAttempts = 0;
    sessionContext.passphraseHash = undefined;
    (sessionContext as ExtendedSessionContext).saltHash = undefined;

    return {
      success: true,
      message: "New vault created for this device",
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

// ============================================================================
// PASSPHRASE HASHING - Device-specific for multi-user safety
// ============================================================================

/**
 * Hash passphrase with device ID
 * This ensures that the same passphrase gives different hashes on different devices
 */
async function hashPassphrase(passphrase: string, salt?: string): Promise {
  const deviceId = getDeviceId();
  const actualSalt = salt || (deviceId + '_' + generateRandomString(SALT_LENGTH));
  const combined = passphrase + actualSalt + '_device_bound';
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
