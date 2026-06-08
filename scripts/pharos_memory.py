#!/usr/bin/env python3
"""
Real-Brain — Pharos-aware memory demo.

The TypeScript Real-Brain skill is a persistent memory vault for AI
agents (think of it as a keychain-backed, cross-session memory
store). The point of the Pharos integration is to record
on-chain interactions so a future agent session can recall:
  - the last address it inspected
  - the last tx hash it debugged
  - the last network it worked on
  - free-form notes per session

This script is a working Python reference implementation that
exposes the same memory operations a real LangChain agent
would use, but anchored to Pharos mainnet/testnet. It's
self-contained, has no external dependencies beyond
`requests`, and is what the demo GIF and submission video
will run.

Usage:
  python scripts/pharos_memory.py init
  python scripts/pharos_memory.py remember "last tx" 0xabc... --tag mainnet
  python scripts/pharos_memory.py recall --tag mainnet
  python scripts/pharos_memory.py list
  python scripts/pharos_memory.py show
  python scripts/pharos_memory.py demo
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional


CHAINS = {
    "mainnet": {
        "label": "Pharos Pacific Mainnet",
        "chain_id": 1672,
        "rpc": "https://rpc.pharos.xyz",
        "explorer": "https://www.pharosscan.xyz",
        "symbol": "PROS",
    },
    "testnet": {
        "label": "Pharos Atlantic Testnet",
        "chain_id": 688689,
        "rpc": "https://atlantic.dplabs-internal.com",
        "explorer": "https://atlantic.pharosscan.xyz",
        "symbol": "PHRS",
    },
}

# Where we persist the vault. In the TypeScript skill, this is
# localStorage in the browser. Here it's a single JSON file in
# the user's data dir so the demo works from a terminal.
DEFAULT_VAULT_PATH = Path.home() / ".real_brain_pharos_vault.json"


class PharosMemory:
    """Persistent memory vault for Pharos-aware agents."""

    def __init__(self, path = DEFAULT_VAULT_PATH):
        self.path = Path(path)
        self.vault: Dict[str, Any] = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.path.exists():
            try:
                with self.path.open() as f:
                    return json.load(f)
            except (json.JSONDecodeError, OSError):
                pass
        return {
            "version": "1.0.0",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "memories": [],
            "counters": {"tx_analyzed": 0, "addresses_inspected": 0, "sessions": 0},
        }

    def _save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(".json.tmp")
        with tmp.open("w") as f:
            json.dump(self.vault, f, indent=2)
        tmp.replace(self.path)

    def remember(
        self,
        key: str,
        value: str,
        tag: Optional[str] = None,
        chain: Optional[str] = None,
        note: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Store a memory entry. Same key overwrites."""
        for m in self.vault["memories"]:
            if m["key"] == key and (tag or "") == (m.get("tag") or ""):
                m.update({
                    "value": value,
                    "tag": tag,
                    "chain": chain,
                    "note": note,
                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                })
                self._save()
                return m
        m = {
            "key": key,
            "value": value,
            "tag": tag,
            "chain": chain,
            "note": note,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        self.vault["memories"].append(m)
        self._save()
        return m

    def recall(self, tag: Optional[str] = None, key: Optional[str] = None) -> List[Dict[str, Any]]:
        """List memory entries. Optional filter by tag and/or key prefix."""
        out = self.vault["memories"]
        if tag:
            out = [m for m in out if m.get("tag") == tag]
        if key:
            out = [m for m in out if m["key"].startswith(key)]
        return out

    def show(self) -> Dict[str, Any]:
        return self.vault

    def init(self) -> None:
        """Reset the vault to a clean state."""
        self.vault = {
            "version": "1.0.0",
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "memories": [],
            "counters": {"tx_analyzed": 0, "addresses_inspected": 0, "sessions": 0},
        }
        self._save()


# -------- Pharos RPC helper (used by demo) --------

def _eth_call(rpc_url: str, to: str, data: str) -> Optional[str]:
    payload = json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": "eth_call",
        "params": [{"to": to, "data": data}, "latest"],
    }).encode()
    try:
        req = urllib.request.Request(
            rpc_url, data=payload, headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read()).get("result")
    except Exception:
        return None


def cmd_init(args: argparse.Namespace) -> int:
    m = PharosMemory(args.vault)
    m.init()
    print(f"✓ vault initialized at {args.vault}")
    return 0


def cmd_remember(args: argparse.Namespace) -> int:
    m = PharosMemory(args.vault)
    rec = m.remember(args.key, args.value, tag=args.tag, chain=args.chain, note=args.note)
    print(f"✓ remembered: [{rec.get('tag', '—')}] {rec['key']} = {rec['value']}")
    if rec.get("note"):
        print(f"  note: {rec['note']}")
    return 0


def cmd_recall(args: argparse.Namespace) -> int:
    m = PharosMemory(args.vault)
    rows = m.recall(tag=args.tag, key=args.key)
    if not rows:
        print(f"(no memories{' for tag=' + args.tag if args.tag else ''})")
        return 0
    for r in rows:
        line = f"  [{r.get('tag', '—')}] {r['key']} = {r['value']}"
        if r.get("chain"):
            line += f"  (chain: {r['chain']})"
        if r.get("note"):
            line += f"  // {r['note']}"
        print(line)
    return 0


def cmd_list(args: argparse.Namespace) -> int:
    m = PharosMemory(args.vault)
    rows = m.vault["memories"]
    if not rows:
        print("(empty vault — use `remember` to add an entry)")
        return 0
    for r in rows:
        line = f"  [{r.get('tag', '—')}] {r['key']} = {r['value']}"
        if r.get("chain"):
            line += f"  (chain: {r['chain']})"
        if r.get("note"):
            line += f"  // {r['note']}"
        print(line)
    print(f"\n  total: {len(rows)} memories  |  counters: {m.vault['counters']}")
    return 0


def cmd_show(args: argparse.Namespace) -> int:
    m = PharosMemory(args.vault)
    print(json.dumps(m.show(), indent=2))
    return 0


def cmd_demo(args: argparse.Namespace) -> int:
    """End-to-end demo: init, write 4 memories, recall, list."""
    m = PharosMemory(args.vault)
    m.init()
    print("✓ vault reset")
    print()

    # Memory #1: the address we just inspected
    m.remember(
        "last_address_inspected",
        "0x67992af9a87f2d6a3062c333d8a06abbe3929438",
        tag="mainnet",
        chain="mainnet",
        note="EOA from the PSCD demo",
    )

    # Memory #2: the tx we just analyzed
    m.remember(
        "last_tx_analyzed",
        "0x9606bcfd027b28e6783ca8b5fef1c3311476a1c30e5bf4464d0340a0d24ba7f7",
        tag="debug",
        chain="mainnet",
        note="reverted tx on Pharos mainnet",
    )

    # Memory #3: a free-form note
    m.remember(
        "session_summary",
        "Inspected 1 EOA + 1 reverted tx on Pharos mainnet. No flash-loan markers.",
        tag="session",
        note="from 2026-06-08 demo run",
    )

    # Memory #4: the last token we looked at
    m.remember(
        "last_token_inspected",
        "USDC @ 0xc879c018db60520f4355c26ed1a6d572cdac1815",
        tag="mainnet",
        note="6 decimals, ~6.13M supply",
    )

    # Bump the counters
    m.vault["counters"]["addresses_inspected"] = 1
    m.vault["counters"]["tx_analyzed"] = 1
    m.vault["counters"]["sessions"] = 1
    m._save()

    print("✓ wrote 4 memories")
    print()
    print("Recalling all memories tagged 'mainnet':")
    for r in m.recall(tag="mainnet"):
        print(f"  [{r.get('tag', '—')}] {r['key']} = {r['value']}")
        if r.get("note"):
            print(f"    // {r['note']}")
    print()
    print("Recalling all memories tagged 'debug':")
    for r in m.recall(tag="debug"):
        print(f"  [{r.get('tag', '—')}] {r['key']} = {r['value']}")
        if r.get("note"):
            print(f"    // {r['note']}")
    print()
    print(f"✓ vault saved to {m.path}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description="Real-Brain — Pharos-aware memory store")
    p.add_argument("--vault", default=str(DEFAULT_VAULT_PATH), help="path to the JSON vault file")
    sub = p.add_subparsers(dest="cmd")

    sub.add_parser("init", help="Reset the vault")

    pr = sub.add_parser("remember", help="Add or update a memory")
    pr.add_argument("key")
    pr.add_argument("value")
    pr.add_argument("--tag")
    pr.add_argument("--chain", choices=list(CHAINS))
    pr.add_argument("--note")

    prc = sub.add_parser("recall", help="List memories (filtered)")
    prc.add_argument("--tag")
    prc.add_argument("--key", help="key prefix filter")

    sub.add_parser("list", help="List all memories")
    sub.add_parser("show", help="Show the full vault JSON")
    sub.add_parser("demo", help="Run a self-contained end-to-end demo")

    args = p.parse_args()
    if args.cmd == "init":    return cmd_init(args)
    if args.cmd == "remember": return cmd_remember(args)
    if args.cmd == "recall":  return cmd_recall(args)
    if args.cmd == "list":    return cmd_list(args)
    if args.cmd == "show":    return cmd_show(args)
    if args.cmd == "demo":    return cmd_demo(args)
    p.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
