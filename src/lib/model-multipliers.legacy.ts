// Backward-compatibility model costs (per request, in USD).
//
// These entries cover legacy/historical model identifiers that may still appear
// in older GitHub Copilot CSV exports. They are maintained by hand and are
// intentionally NOT touched by the auto-update workflow.
//
// Values are the raw cost per request in USD, converted from the original
// multipliers using the legacy base rate of $0.04/request.
//
// Current (live) model costs live in `model-multipliers.generated.ts`
// and are refreshed daily from rajbos/github-copilot-model-notifier.
export const LEGACY_MODEL_COSTS: Record<string, number> = {
  'gpt-4o-2024-11-20': 0,
  'gpt-4.1-2025-04-14': 0,
  'gpt-4o': 0,
  'gpt-4.1': 0,
  'gpt-4.5': 2,
  'gpt-4.1-vision': 0,
  'claude-sonnet-3.5': 0.04,
  'claude-sonnet-3.7': 0.04,
  'claude-sonnet-3.7-thinking': 0.05,
  'claude-sonnet-4': 0.04,
  'claude-opus-4': 0.4,
  'gemini-2.0-flash': 0.01,
  'gemini-2.5-pro': 0.04,
  'o1': 0.4,
  'o3': 0.04,
  'o3-mini': 0.0132,
  'o3-mini-2025-01-31': 0.0132,
  'o4-mini': 0.0132,
  'o4-mini-2025-04-16': 0.0132,
  // Retired from the upstream "current models" list (last seen in
  // release models-2026-05-29-091242) but still present in historical exports.
  'Claude Haiku 4.5': 0.33,
  'Claude Opus 4.5': 3,
  'Claude Opus 4.6': 3,
  'Claude Opus 4.6 (fast mode) (preview)': 30,
  'Claude Opus 4.7': 15,
  'Claude Sonnet 4.5': 1,
  'Claude Sonnet 4.6': 1,
  'Gemini 2.5 Pro': 1,
  'Gemini 3 Flash': 0.33,
  'Gemini 3.1 Pro': 1,
  'Gemini 3.5 Flash': 14,
  'GPT-4.1': 0,
  'GPT-5 mini': 0,
  'GPT-5.2': 1,
  'GPT-5.2-Codex': 1,
  'GPT-5.4': 1,
  'GPT-5.4 mini': 0.33,
  'GPT-5.5': 7.5,
  'Raptor mini': 0,
};

// Legacy default model identifiers (always grouped under "Default").
export const LEGACY_DEFAULT_MODELS: string[] = [
  'gpt-4o-2024-11-20',
  'gpt-4.1-2025-04-14',
  'GPT-4.1',
  'GPT-5 mini',
  'Raptor mini',
];
