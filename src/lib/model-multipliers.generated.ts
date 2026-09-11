// AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
//
// Source: https://github.com/rajbos/github-copilot-model-notifier (latest release)
// Updated by: scripts/update-model-multipliers.py (run daily via GitHub Actions)
//
// To make manual changes, edit `model-multipliers.legacy.ts` instead.

export const CURRENT_MODELS_SOURCE_RELEASE = 'models-2026-09-11-081258';

export const CURRENT_MODEL_COSTS: Record<string, number> = {
  'GPT-5 mini': 2,
  'GPT-5.3-Codex': 14,
  'GPT-5.4': 15,
  'GPT-5.4 mini': 4.5,
  'GPT-5.4 nano': 1.25,
  'GPT-5.5': 30,
  'GPT-5.6 Luna': 1.2,
  'GPT-5.6 Sol': 20,
  'GPT-5.6 Terra': 12,
  'GPT-6 Astra': 50,
};

// Models with a $0 cost (free) are treated as "Default" and grouped together.
export const CURRENT_DEFAULT_MODELS: string[] = [
];
