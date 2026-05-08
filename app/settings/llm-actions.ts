"use server"

import { prisma } from "@/lib/prisma"
import type { LlmMessage } from "@/lib/services/llm-service"

export interface LlmConfig {
  id?: string;
  provider: "DEEPSEEK" | "KIMI" | "OPENAI" | "AZURE_OPENAI" | "GEMINI";
  name: string;
  apiKeyEncrypted: string;
  endpointUrl?: string;
  deploymentName?: string;
  version?: string;
  isDefault: boolean;
  enabled: boolean;
}

export async function saveLlmConfig(config: LlmConfig) {
  try {
    const data = {
      provider: config.provider,
      name: config.name,
      ['apiKey']: config.apiKeyEncrypted,
      endpointUrl: config.endpointUrl || null,
      deploymentName: config.deploymentName || null,
      version: config.version || null,
      isDefault: config.isDefault,
      enabled: config.enabled,
    };

    if (config.isDefault) {
      await prisma.llmConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    let savedConfig;
    if (config.id) {
      savedConfig = await prisma.llmConfig.update({
        where: { id: config.id },
        data,
      });
    } else {
      savedConfig = await prisma.llmConfig.create({
        data,
      });
    }

    return { success: true, message: "LLM configuration saved successfully", id: savedConfig.id };
  } catch (error) {
    console.error("Error saving LLM config:", error);
    return { success: false, error: "Failed to save LLM configuration" };
  }
}

export async function testLlmConnection(config: LlmConfig) {
  try {
    if (!config.enabled || !config.apiKeyEncrypted) {
      return { success: false, message: "Please enable the configuration and provide an API key" };
    }

    // Basic validation based on provider
    switch (config.provider) {
      case "AZURE_OPENAI":
        if (!config.endpointUrl || !config.deploymentName) {
          return { success: false, message: "Azure OpenAI requires endpoint URL and deployment name" };
        }
        break;
      case "DEEPSEEK":
      case "KIMI":
      case "OPENAI":
        if (!config.endpointUrl) {
          // Use default endpoints if not provided
          // For now, just require endpoint URL for custom deployments
        }
        break;
      case "GEMINI":
        // No specific additional fields required
        break;
    }

    // Make a real API test call with a simple prompt
    const { callLLM } = await import("@/lib/services/llm-service");
    
    const testMessages: LlmMessage[] = [
      { role: "system", content: "You are a helpful assistant. Respond concisely." },
      { role: "user", content: "Hello, please respond with 'OK' if you receive this message." }
    ];

    // Set a timeout for the API call
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection timeout")), 10000)
    );

    const response = await Promise.race([
      callLLM(config, testMessages, { temperature: 0.7, maxTokens: 10 }),
      timeoutPromise
    ]) as any; // cast because Promise.race loses type

    // Check if we got a valid response
    if (response && response.content && response.content.includes("OK")) {
      return { success: true, message: "Successfully connected to LLM API. Configuration is valid." };
    } else {
      return { success: false, message: "Received unexpected response from LLM API." };
    }
  } catch (error) {
    console.error("Error testing LLM connection:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Failed to connect to LLM API: ${errorMessage}` };
  }
}

export async function getLlmConfigs() {
  try {
    const configs = await prisma.llmConfig.findMany({
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    return configs.map(config => ({
      id: config.id,
      provider: config.provider,
      name: config.name,
      apiKeyEncrypted: config.apiKey, // Note: returning encrypted API key (plain text for now)
      endpointUrl: config.endpointUrl || undefined,
      deploymentName: config.deploymentName || undefined,
      version: config.version || undefined,
      isDefault: config.isDefault,
      enabled: config.enabled,
    })) as LlmConfig[];
  } catch (error) {
    console.error("Error getting LLM configs:", error);
    return [];
  }
}

export async function getLlmConfig(id: string) {
  try {
    const config = await prisma.llmConfig.findUnique({
      where: { id },
    });
    if (!config) return null;
    return {
      id: config.id,
      provider: config.provider,
      name: config.name,
      apiKeyEncrypted: config.apiKey,
      endpointUrl: config.endpointUrl || undefined,
      deploymentName: config.deploymentName || undefined,
      version: config.version || undefined,
      isDefault: config.isDefault,
      enabled: config.enabled,
    } as LlmConfig;
  } catch (error) {
    console.error("Error getting LLM config:", error);
    return null;
  }
}

export async function deleteLlmConfig(id: string) {
  try {
    await prisma.llmConfig.delete({
      where: { id },
    });
    return { success: true, message: "LLM configuration deleted successfully" };
  } catch (error) {
    console.error("Error deleting LLM config:", error);
    return { success: false, error: "Failed to delete LLM configuration" };
  }
}

export async function setDefaultLlmConfig(id: string) {
  try {
    // First, set all configs to non-default
    await prisma.llmConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    // Then set the specified config as default
    await prisma.llmConfig.update({
      where: { id },
      data: { isDefault: true },
    });
    return { success: true, message: "Default LLM configuration updated successfully" };
  } catch (error) {
    console.error("Error setting default LLM config:", error);
    return { success: false, error: "Failed to set default LLM configuration" };
  }
}

export async function getDefaultLlmConfig(): Promise<LlmConfig | null> {
  try {
    const config = await prisma.llmConfig.findFirst({
      where: { 
        isDefault: true,
        enabled: true 
      },
    });
    
    if (!config) {
      // If no default config, try to get any enabled config
      const anyEnabledConfig = await prisma.llmConfig.findFirst({
        where: { enabled: true },
        orderBy: { createdAt: 'asc' },
      });
      
      if (!anyEnabledConfig) return null;
      
      return {
        id: anyEnabledConfig.id,
        provider: anyEnabledConfig.provider,
        name: anyEnabledConfig.name,
        apiKeyEncrypted: anyEnabledConfig.apiKey,
        endpointUrl: anyEnabledConfig.endpointUrl || undefined,
        deploymentName: anyEnabledConfig.deploymentName || undefined,
        version: anyEnabledConfig.version || undefined,
        isDefault: anyEnabledConfig.isDefault,
        enabled: anyEnabledConfig.enabled,
      } as LlmConfig;
    }
    
    return {
      id: config.id,
      provider: config.provider,
      name: config.name,
      apiKeyEncrypted: config.apiKey,
      endpointUrl: config.endpointUrl || undefined,
      deploymentName: config.deploymentName || undefined,
      version: config.version || undefined,
      isDefault: config.isDefault,
      enabled: config.enabled,
    } as LlmConfig;
  } catch (error) {
    console.error("Error getting default LLM config:", error);
    return null;
  }
}