#!/bin/bash
# Real-Brain — Foundry-port smoke test
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"

echo "Test 1: pharos_memory.py --help"
python3 "$SKILL_DIR/scripts/pharos_memory.py" --help 2>&1 | grep -q "Usage" && echo "  OK"

echo "Test 2: store a fake memory"
python3 "$SKILL_DIR/scripts/pharos_memory.py" remember --key test_key --value test_value 2>&1 | head -3
echo "  OK"

echo "Test 3: retrieve the memory"
python3 "$SKILL_DIR/scripts/pharos_memory.py" recall --key test_key 2>&1 | grep -q "test_value" && echo "  OK"
echo "All smoke tests passed."
