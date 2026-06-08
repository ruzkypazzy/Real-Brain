"""
Smoke tests for Real-Brain (Pharos memory store reference impl).

Covers:
  - Vault load/save roundtrip
  - remember() creates new entry, updates existing
  - recall() with tag/key filters
  - init() resets the vault
  - demo() runs end-to-end
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT / "scripts"))

import pytest  # noqa: E402

import pharos_memory  # noqa: E402
from pharos_memory import PharosMemory  # noqa: E402


@pytest.fixture
def tmp_vault(tmp_path):
    """Each test gets a fresh vault path."""
    return tmp_path / "test_vault.json"


def test_vault_load_creates_empty_when_missing(tmp_vault):
    """Loading a non-existent vault should give an empty default."""
    m = PharosMemory(tmp_vault)
    assert m.vault["version"] == "1.0.0"
    assert m.vault["memories"] == []
    assert m.vault["counters"]["tx_analyzed"] == 0


def test_init_resets_vault(tmp_vault):
    """init() should clear all memories and reset counters."""
    m = PharosMemory(tmp_vault)
    m.remember("k", "v", tag="t")
    assert len(m.vault["memories"]) == 1
    m.init()
    assert m.vault["memories"] == []
    assert m.vault["counters"]["tx_analyzed"] == 0


def test_remember_creates_new(tmp_vault):
    """remember() with a new key should append a memory."""
    m = PharosMemory(tmp_vault)
    m.remember("my_key", "my_value", tag="test")
    assert len(m.vault["memories"]) == 1
    assert m.vault["memories"][0]["key"] == "my_key"
    assert m.vault["memories"][0]["value"] == "my_value"
    assert m.vault["memories"][0]["tag"] == "test"


def test_remember_updates_existing(tmp_vault):
    """remember() with the same key + tag should update, not duplicate."""
    m = PharosMemory(tmp_vault)
    m.remember("k", "v1", tag="t")
    m.remember("k", "v2", tag="t")
    assert len(m.vault["memories"]) == 1
    assert m.vault["memories"][0]["value"] == "v2"


def test_remember_different_tags_create_separate(tmp_vault):
    """Same key with different tags should create separate entries."""
    m = PharosMemory(tmp_vault)
    m.remember("k", "v1", tag="mainnet")
    m.remember("k", "v2", tag="testnet")
    assert len(m.vault["memories"]) == 2


def test_recall_filters_by_tag(tmp_vault):
    m = PharosMemory(tmp_vault)
    m.remember("a", "1", tag="x")
    m.remember("b", "2", tag="y")
    m.remember("c", "3", tag="x")
    rows = m.recall(tag="x")
    assert len(rows) == 2
    assert {r["key"] for r in rows} == {"a", "c"}


def test_recall_filters_by_key_prefix(tmp_vault):
    m = PharosMemory(tmp_vault)
    m.remember("last_tx", "0xabc")
    m.remember("last_addr", "0xdef")
    m.remember("session_id", "xyz")
    rows = m.recall(key="last_")
    assert len(rows) == 2
    assert {r["key"] for r in rows} == {"last_tx", "last_addr"}


def test_recall_no_filters_returns_all(tmp_vault):
    m = PharosMemory(tmp_vault)
    m.remember("a", "1")
    m.remember("b", "2")
    assert len(m.recall()) == 2


def test_save_persists_to_disk(tmp_vault):
    """After save, reading the file should give back the vault contents."""
    m = PharosMemory(tmp_vault)
    m.remember("k", "v", tag="t")
    with tmp_vault.open() as f:
        data = json.load(f)
    assert data["memories"][0]["key"] == "k"
    assert data["memories"][0]["value"] == "v"


def test_load_picks_up_existing(tmp_vault):
    """Creating a second PharosMemory on the same path should see prior writes."""
    PharosMemory(tmp_vault).remember("k", "v", tag="t")
    m2 = PharosMemory(tmp_vault)
    assert len(m2.vault["memories"]) == 1
    assert m2.vault["memories"][0]["key"] == "k"


def test_demo_runs(tmp_vault):
    """The end-to-end demo should write 4 memories and recall them."""
    p = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "pharos_memory.py"),
         "--vault", str(tmp_vault), "demo"],
        capture_output=True, text=True,
    )
    assert p.returncode == 0
    data = json.loads(tmp_vault.read_text())
    assert len(data["memories"]) == 4
    keys = {m["key"] for m in data["memories"]}
    assert "last_address_inspected" in keys
    assert "last_tx_analyzed" in keys
    assert "session_summary" in keys
    assert "last_token_inspected" in keys


def test_chains_known():
    """Both Pharos networks must be in the CHAINS table."""
    for k in ("mainnet", "testnet"):
        assert k in pharos_memory.CHAINS
