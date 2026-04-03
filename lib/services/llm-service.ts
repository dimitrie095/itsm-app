import { LlmConfig } from "@/app/settings/llm-actions";
import { getDefaultLlmConfig } from "@/app/settings/llm-actions";

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LlmRequestOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// Default endpoints for different providers
const DEFAULT_ENDPOINTS: Record<string, string> = {
  OPENAI: "https://api.openai.com/v1/chat/completions",
  DEEPSEEK: "https://api.deepseek.com/chat/completions",
  KIMI: "https://api.moonshot.cn/v1/chat/completions",
  GEMINI: "https://generativelanguage.googleapis.com/v1beta/models",
};

// Default models for different providers
const DEFAULT_MODELS: Record<string, string> = {
  OPENAI: "gpt-4o-mini",
  DEEPSEEK: "deepseek-chat",
  KIMI: "moonshot-v1-8k",
  AZURE_OPENAI: "gpt-4",
  GEMINI: "gemini-pro",
};

/**
 * Get the API endpoint URL for a provider
 */
function getEndpointUrl(config: LlmConfig): string {
  if (config.endpointUrl) {
    return config.endpointUrl;
  }
  return DEFAULT_ENDPOINTS[config.provider] || "";
}

/**
 * Make a request to OpenAI API
 */
async function callOpenAI(
  config: LlmConfig,
  messages: LlmMessage[],
  options: LlmRequestOptions = {}
): Promise<LlmResponse> {
  const endpoint = getEndpointUrl(config) || DEFAULT_ENDPOINTS.OPENAI;
  const model = options.model || DEFAULT_MODELS.OPENAI;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKeyEncrypted}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Make a request to DeepSeek API
 */
async function callDeepSeek(
  config: LlmConfig,
  messages: LlmMessage[],
  options: LlmRequestOptions = {}
): Promise<LlmResponse> {
  const endpoint = getEndpointUrl(config) || DEFAULT_ENDPOINTS.DEEPSEEK;
  const model = options.model || DEFAULT_MODELS.DEEPSEEK;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKeyEncrypted}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`DeepSeek API error: ${response.status} - URL: ${endpoint} - Response: ${error}`);
    throw new Error(`DeepSeek API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Make a request to Kimi API
 */
async function callKimi(
  config: LlmConfig,
  messages: LlmMessage[],
  options: LlmRequestOptions = {}
): Promise<LlmResponse> {
  const endpoint = getEndpointUrl(config) || DEFAULT_ENDPOINTS.KIMI;
  const model = options.model || DEFAULT_MODELS.KIMI;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKeyEncrypted}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Make a request to Azure OpenAI API
 */
async function callAzureOpenAI(
  config: LlmConfig,
  messages: LlmMessage[],
  options: LlmRequestOptions = {}
): Promise<LlmResponse> {
  if (!config.endpointUrl || !config.deploymentName) {
    throw new Error(
      "Azure OpenAI requires endpointUrl and deploymentName to be configured"
    );
  }

  const apiVersion = config.version || "2024-02-01";
  const endpoint = `${config.endpointUrl}/openai/deployments/${config.deploymentName}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKeyEncrypted,
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Make a request to Gemini API
 */
async function callGemini(
  config: LlmConfig,
  messages: LlmMessage[],
  options: LlmRequestOptions = {}
): Promise<LlmResponse> {
  const model = options.model || DEFAULT_MODELS.GEMINI;
  const endpoint =
    getEndpointUrl(config) ||
    `${DEFAULT_ENDPOINTS.GEMINI}/${model}:generateContent?key=${config.apiKeyEncrypted}`;

  // Convert messages to Gemini format
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : m.role === "system" ? "user" : m.role,
    parts: [{ text: m.content }],
  }));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2000,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  return {
    content,
    usage: data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : undefined,
  };
}

/**
 * Call the appropriate LLM provider based on config
 */
export async function callLLM(
  config: LlmConfig,
  messages: LlmMessage[],
  options?: LlmRequestOptions
): Promise<LlmResponse> {
  if (!config.enabled) {
    throw new Error("LLM configuration is not enabled");
  }

  if (!config.apiKeyEncrypted) {
    throw new Error("LLM API key is not configured");
  }

  switch (config.provider) {
    case "OPENAI":
      return callOpenAI(config, messages, options);
    case "DEEPSEEK":
      return callDeepSeek(config, messages, options);
    case "KIMI":
      return callKimi(config, messages, options);
    case "AZURE_OPENAI":
      return callAzureOpenAI(config, messages, options);
    case "GEMINI":
      return callGemini(config, messages, options);
    default:
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
  }
}

/**
 * Generate content using the default LLM configuration
 */
export async function generateWithDefaultLLM(
  prompt: string,
  systemPrompt?: string,
  options?: LlmRequestOptions
): Promise<LlmResponse> {
  const config = await getDefaultLlmConfig();

  if (!config) {
    throw new Error(
      "No LLM configuration found. Please configure an LLM in Settings."
    );
  }

  const messages: LlmMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  return callLLM(config, messages, options);
}

/**
 * Check if a default LLM is configured and enabled
 */
export async function isLlmConfigured(): Promise<boolean> {
  try {
    const config = await getDefaultLlmConfig();
    return config !== null && config.enabled === true;
  } catch {
    return false;
  }
}
