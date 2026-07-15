#!/bin/bash
# RASPIS — сессия басталу hook-ы (тек Claude Code on the web).
# Мақсаты: (1) тәуелділіктер орнында болсын (build/lint жұмыс істесін),
# (2) graphify білім графын дайындасын — кодтық сұрақтарда бүкіл файлды
# оқымай, дәл жерге бағыттап токен үнемдеу үшін.
# Барлық қадам «құласа да сессияны тоқтатпайды» (set -e ЖОҚ) — идемпотентті.
set -uo pipefail

# Тек қашықтағы (веб) ортада ғана
[ "${CLAUDE_CODE_REMOTE:-}" != "true" ] && exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# 1) Node тәуелділіктері — жоқ болса ғана (кэштелген контейнерде өткізіледі)
if [ ! -d node_modules ]; then
  npm install --no-audit --no-fund || true
fi

# 2) Graphify CLI — жоқ болса орнату (эфемерлі контейнерде қажет)
GBIN="$HOME/.local/bin/graphify"
if [ ! -x "$GBIN" ] && command -v uv >/dev/null 2>&1; then
  uv tool install graphifyy >/dev/null 2>&1 || true
fi

# 3) Білім графын жаңарту (AST, жергілікті, LLM/кілтсіз) — CLI бар болса ғана
if [ -x "$GBIN" ]; then
  "$GBIN" update . >/dev/null 2>&1 || true
fi

exit 0
