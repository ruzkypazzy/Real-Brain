/**
 * Real Brain Memory Types
 * Defines all TypeScript interfaces for the persistent memory system
 */

// Memory Categories
export interface LastSession {
  summary: string;
  timestamp: string;
  tasksCompleted: string[];
  tasksPending: string[];
  networkUsed: "mainnet" | "testnet";
}

export interface UserPreferences {
  preferredNetwork: "mainnet" | "testnet";
  gasSettings: GasPreference;
  tokenPairs: string[];
  workflowPreferences: string[];
}

export interface GasPreference {
  maxGasPrice?: string;
  priorityFee?: string;
  gasLimit?: number;
}

export interface WatchlistItem {
  address: string;
  type: "token" | "contract" | "wallet";
  label: string;
  notes: string;
  addedAt: string;
  lastInteraction?: string;
}

export interface TransactionRecord {
  hash: string;
  timestamp: string;
  purpose: string;
  network: "mainnet" | "testnet";
  status: "success" | "failed" | "pending";
  errorReason?: string;
  contract?: string;
  tokenAmount?: string;
}

export interface CustomNote {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Warning {
  id: string;
  type: "failed_tx" | "contract_error" | "security" | "testnet_only";
  description: string;
  relatedAddress?: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface OnchainMemory {
  deployedContracts: DeployedContract[];
  interactedContracts: InteractedContract[];
  contractABIs: ContractABI[];
  tokenBalances: TokenBalance[];
  tokenTransfers: TokenTransfer[];
  gasHistory: GasRecord[];
  averageGasPrices: GasAverage[];
}

export interface DeployedContract {
  address: string;
  name: string;
  type: string;
  deployer: string;
  timestamp: string;
  network: string;
  txHash: string;
}

export interface InteractedContract {
  address: string;
  name: string;
  lastInteraction: string;
  totalInteractions: number;
  functions: string[];
}

export interface ContractABI {
  address: string;
  name: string;
  functions: string[];
  events: string[];
}

export interface TokenBalance {
  token: string;
  balance: string;
  lastUpdated: string;
}

export interface TokenTransfer {
  token: string;
  from: string;
  to: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

export interface GasRecord {
  timestamp: string;
  network: string;
  gasPrice: string;
  priorityFee: string;
  baseFee: string;
}

export interface GasAverage {
  network: string;
  averageFast: string;
  averageStandard: string;
  averageSlow: string;
}

export interface UserIdentity {
  walletAddresses: string[];
  preferredWallet?: string;
  createdAt: string;
  lastActive: string;
}

export interface PassphraseHash {
  hash: string;
  salt: string;
  createdAt: string;
  lastChanged?: string;
}

export interface SecuritySettings {
  autoLockMinutes: number;
  maxFailedAttempts: number;
  requireAuthOnStartup: boolean;
}

export interface MemoryVault {
  version: string;
  userIdentity: UserIdentity;
  lastSession: LastSession;
  preferences: UserPreferences;
  watchlist: WatchlistItem[];
  transactionHistory: TransactionRecord[];
  customNotes: CustomNote[];
  warnings: Warning[];
  onchainMemory: OnchainMemory;
  security: SecuritySettings;
  createdAt: string;
  updatedAt: string;
}

export interface SessionContext {
  isAuthenticated: boolean;
  passphraseHash?: string;
  failedAttempts: number;
  lastActivity: string;
}

export interface RealBrainConfig {
  storagePath?: string;
  autoSave: boolean;
  maxMemorySize: number;
  encryptionEnabled: boolean;
}

export interface MemoryOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface MemoryQueryResult {
  relevantMemories: any[];
  suggestions: string[];
  warnings: string[];
  context: string;
}  from: string;
  to: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

export interface GasRecord {
  timestamp: string;
  network: string;
  gasPrice: string;
  priorityFee: string;
  baseFee: string;
}

export interface GasAverage {
  network: string;
  averageFast: string;
  averageStandard: string;
  averageSlow: string;
}

export interface UserIdentity {
  walletAddresses: string[];
  preferredWallet?: string;
  createdAt: string;
  lastActive: string;
}

export interface PassphraseHash {
  hash: string;
  salt: string;
  createdAt: string;
  lastChanged?: string;
}

export interface SecuritySettings {
  autoLockMinutes: number;
  maxFailedAttempts: number;
  requireAuthOnStartup: boolean;
}

export interface MemoryVault {
  version: string;
  userIdentity: UserIdentity;
  lastSession: LastSession;
  preferences: UserPreferences;
  watchlist: WatchlistItem[];
  transactionHistory: TransactionRecord[];
  customNotes: CustomNote[];
  warnings: Warning[];
  onchainMemory: OnchainMemory;
  security: SecuritySettings;
  createdAt: string;
  updatedAt: string;
}

export interface SessionContext {
  isAuthenticated: boolean;
  passphraseHash?: string;
  failedAttempts: number;
  lastActivity: string;
}

export interface RealBrainConfig {
  storagePath?: string;
  autoSave: boolean;
  maxMemorySize: number;
  encryptionEnabled: boolean;
}

export interface MemoryOperationResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface MemoryQueryResult {
  relevantMemories: any[];
  suggestions: string[];
  warnings: string[];
  context: string;
}
