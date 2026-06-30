import type { AIProvider, AIResponse } from '@/lib/ai/types'
import { AnthropicProvider } from '@/lib/ai/anthropic-provider'
import { OpenAIProvider } from '@/lib/ai/openai-provider'
import { MockProvider } from '@/lib/ai/mock-provider'
import type { AiCoreFeature } from './types'
import { resolveProviderName, resolveModel, getGenerationParams, type CoreProviderName } from './model-policy'

const registry = new Map<CoreProviderName, AIProvider>()

function getProvider(name: CoreProviderName): AIProvider {
  if (!registry.has(name)) {
    switch (name) {
      case 'anthropic': registry.set(name, new AnthropicProvider()); break
      case 'openai': registry.set(name, new OpenAIProvider()); break
      default: registry.set(name, new MockProvider()); break
    }
  }
  return registry.get(name)!
}

export function selectProvider(feature: AiCoreFeature): AIProvider {
  return getProvider(resolveProviderName(feature))
}

export async function generate(feature: AiCoreFeature, prompt: string, model?: string): Promise<AIResponse> {
  const provider = selectProvider(feature)
  const { maxTokens, temperature } = getGenerationParams(feature)
  return provider.generateText(prompt, {
    maxTokens,
    temperature,
    model: model ?? resolveModel(feature),
  })
}

export async function generateMock(prompt: string): Promise<AIResponse> {
  return getProvider('mock').generateText(prompt, {})
}
