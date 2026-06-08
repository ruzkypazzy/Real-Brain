# Real-Brain — Persistent Memory for Pharos Agents

A Pharos Agent skill that gives a Pharos-aware AI agent a **persistent local memory vault**: it remembers the last wallet it inspected, the last token it called, the last tx it debugged, and any free-form notes you want to keep — across sessions, across restarts, across machines (if you copy the vault file).

If you've ever had to re-explain to your agent "here's my USDC address, here are the testnet RPCs, here's the tx that reverted yesterday" at the start of every session, this skill kills that problem.

The vault is a single JSON file at `~/.real_brain_pharos_vault.json`. The skill itself never touches the network — it just reads and writes the file atomically. The Python CLI has 6 subcommands, and any agent can import the `pharos_memory` module directly.

## TL;DR for a total novice

```bash
# 1. Get the code
git clone https://github.com/ruzkypazzy/Real-Brain
cd Real-Brain

# 2. Try the demo (creates a sample vault, prints 4 sample memories, exits)
python3 scripts/pharos_memory.py demo
```

That's it. The demo writes a sample vault to your home directory so you can poke at it. To see what got written:

```bash
python3 scripts/pharos_memory.py show
```

To start fresh:

```bash
python3 scripts/pharos_memory.py init
```

## Install

```bash
git clone https://github.com/ruzkypazzy/Real-Brain
cd Real-Brain
```

That's it. No `npm install`, no `forge build`, no compile. The skill is pure Python 3.10+ with **no external dependencies** (it uses only the standard library — no `requests`, no `httpx`).

The only optional dep is `pytest` if you want to run the test suite:

```bash
pip install pytest
```

## How a beginner uses it — full walkthrough

### Scenario: "I want my agent to remember which wallet I work on"

```bash
# 1. Initialize an empty vault
python3 scripts/pharos_memory.py init

# 2. Remember a wallet
python3 scripts/pharos_memory.py remember "my_wallet" "0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1" \
  --tag wallet --tag mainnet --note "Main DeFi wallet"

# 3. Recall it later (in any session, any time)
python3 scripts/pharos_memory.py recall --tag wallet
# Output:
#   [mainnet] my_wallet = 0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1
#     // Main DeFi wallet
```

### Scenario: "Remember a USDC contract I keep querying"

```bash
python3 scripts/pharos_memory.py remember "USDC_address" "0xc879c018db60520f4355c26ed1a6d572cdac1815" \
  --tag token --tag stablecoin --tag mainnet \
  --note "6 decimals, ~6.13M supply"

# Find it later by tag prefix
python3 scripts/pharos_memory.py recall --tag token
# Find it later by key prefix
python3 scripts/pharos_memory.py recall --key USDC
```

### Scenario: "Save the tx I just debugged, so I can find it next time"

```bash
python3 scripts/pharos_memory.py remember "last_tx_analyzed" "0x9606bcfd027b28e6783ca8b5fef1c3311476a1c30e5bf4464d0340a0d24ba7f7" \
  --tag debug --tag mainnet --note "reverted tx, panic 0x11"

python3 scripts/pharos_memory.py recall --tag debug
```

### Scenario: "Show me the whole vault"

```bash
python3 scripts/pharos_memory.py show     # full JSON, pretty-printed
python3 scripts/pharos_memory.py list     # flat list of (key, value, tags, chain)
```

## All subcommands

| Subcommand | What it does | Args |
|---|---|---|
| `init` | Reset the vault to empty | — |
| `remember` | Add or update a memory | `<key> <value> [--tag T] [--chain mainnet\|testnet] [--note "..."]` |
| `recall` | List memories matching filters | `[--tag T] [--key prefix] [--chain C]` |
| `list` | Flat list of all memories | — |
| `show` | Pretty-print the full vault JSON | — |
| `demo` | Self-contained end-to-end demo (writes 4 sample memories) | — |

The vault file is at `~/.real_brain_pharos_vault.json` by default. Override with `--vault /some/other/path.json`. Writes are atomic (write to temp file → rename), so a crash mid-write can never corrupt the vault.

## Memory record format

Each memory is a single JSON object:

```json
{
  "key": "my_wallet",
  "value": "0x742d35Cc6634C0532925a3b844Bc9e7595f0a5b1",
  "tags": ["wallet", "mainnet"],
  "chain": "mainnet",
  "note": "Main DeFi wallet",
  "created_at": "2026-06-08T10:34:00Z",
  "updated_at": "2026-06-08T10:34:00Z"
}
```

- **`key`** — a free-form name. Use snake_case for grep-ability.
- **`value`** — anything string-serializable. For addresses, just the hex string.
- **`tags`** — list of free-form tags for filtering. Recommend: `token`/`wallet`/`contract` for type, `mainnet`/`testnet` for chain, anything else you want.
- **`chain`** — Pharos chain scope. Defaults to `""` (chain-agnostic). The `recall` filter respects this so mainnet memories don't bleed into testnet sessions.
- **`note`** — human-readable context.

## Use as a Python library (from inside an agent)

```python
import sys
sys.path.insert(0, "scripts")
from pharos_memory import vault

# Set
vault.remember("USDC_address", "0x...", tags=["token", "stablecoin"], chain="mainnet")

# Get
entry = vault.recall_one("USDC_address", chain="mainnet")
print(entry["value"], entry["note"])

# Search
for entry in vault.recall(tag="token", chain="mainnet"):
    print(entry["key"], "->", entry["value"])
```

The module is **import-safe**: it has no side effects on import, reads the vault lazily on first access, and writes are atomic.

## What it deliberately does NOT do

- **No network calls.** The vault is a local file. Real-Brain has nothing to do with RPC.
- **No key storage.** There is no `--import-key`, no `--sign`, no broadcast. The skill is purely a memory layer; signing belongs to a separate skill.
- **No encryption-at-rest by default.** The vault is plain JSON. If you want at-rest encryption, set `REAL_BRAIN_VAULT_KEY` to a non-empty string in your shell and the skill will XOR-encrypt the file with that key on write. **Don't lose the key** — there's no recovery path (intentional).

## Tests

```bash
cd Real-Brain
pip install pytest
python3 -m pytest tests/ -v
```

12 tests cover: vault load/save roundtrip, `remember()` create vs update paths, tag filters, key prefix filters, the `init` reset, the `demo` end-to-end run, and the chain config. 12/12 pass.

## Networks (the chains the memories can be scoped to)

| Network | Chain ID | Notes |
|---|---:|---|
| Pharos Pacific Mainnet | 1672 | The default for any Pharos skill |
| Pharos Atlantic Testnet | 688689 | The default for Pharos testnet workflows |

A memory's `chain` field is **just a string** — Real-Brain doesn't validate it against an RPC. You can set `chain="pharos"`, `chain="eth"`, `chain="solana"`, or leave it empty for chain-agnostic.

## Why a Pharos-specific memory skill?

A generic LangChain memory stores conversation. A Pharos memory stores **on-chain state**: which address you just looked at, which tx you just debugged, which contract you just deployed, which token you just verified. The tag/chain scoping means mainnet memories stay out of testnet sessions — a real risk in any agent that does both.

## License

MIT
