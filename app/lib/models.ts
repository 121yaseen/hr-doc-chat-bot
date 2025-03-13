// Available Gemini models
export const AVAILABLE_MODELS = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Balanced performance and speed",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Best for complex reasoning",
  },
  {
    id: "gemini-1.0-pro",
    name: "Gemini 1.0 Pro",
    description: "Legacy model (fallback)",
  },
];

// Default model to use
export const DEFAULT_MODEL = "gemini-1.5-flash";
