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
};

// Legacy default model identifiers (always grouped under "Default").
export const LEGACY_DEFAULT_MODELS: string[] = [
  'gpt-4o-2024-11-20',
  'gpt-4.1-2025-04-14',
];
