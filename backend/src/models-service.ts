import { Models } from '@opencode-ai/models';

interface CachedCatalog {
  data: Models.Catalog;
  timestamp: number;
}

class ModelsService {
  private cache: CachedCatalog | null = null;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private client: Models.ModelsClient;

  constructor() {
    this.client = Models.make({
      baseUrl: 'https://models.dev',
    });
  }

  async getCatalog(): Promise<Models.Catalog> {
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data;
    }

    try {
      const catalog = await this.client.catalog();
      this.cache = { data: catalog, timestamp: Date.now() };
      return catalog;
    } catch (error) {
      console.error('Failed to fetch models.dev catalog:', error);
      if (this.cache) {
        return this.cache.data;
      }
      throw error;
    }
  }

  async getOpenRouterModels(): Promise<Models.Model[]> {
    const catalog = await this.getCatalog();
    const openrouterProvider = catalog.providers['openrouter'];
    
    if (!openrouterProvider) {
      return [];
    }

    return Object.values(openrouterProvider.models);
  }

  async getFreeModels(): Promise<Models.Model[]> {
    const models = await this.getOpenRouterModels();
    return models.filter(model => 
      model.cost && model.cost.input === 0 && model.cost.output === 0
    );
  }

  async getCodingModels(): Promise<Models.Model[]> {
    const models = await this.getOpenRouterModels();
    return models.filter(model => 
      model.tool_call === true && 
      model.limit.context >= 32000
    );
  }

  async getReasoningModels(): Promise<Models.Model[]> {
    const models = await this.getOpenRouterModels();
    return models.filter(model => model.reasoning === true);
  }

  async searchModels(query: string): Promise<Models.Model[]> {
    const models = await this.getOpenRouterModels();
    const lowerQuery = query.toLowerCase();
    
    return models.filter(model => 
      model.name.toLowerCase().includes(lowerQuery) ||
      model.description.toLowerCase().includes(lowerQuery) ||
      model.id.toLowerCase().includes(lowerQuery)
    );
  }

  async getModelById(id: string): Promise<Models.Model | null> {
    const models = await this.getOpenRouterModels();
    return models.find(model => model.id === id) || null;
  }

  async getModelMetadata(modelId: string): Promise<Models.ModelMetadata | null> {
    const catalog = await this.getCatalog();
    const labModelId = modelId.split('/').slice(0, 2).join('/');
    return catalog.models[labModelId] || null;
  }

  estimateCost(
    model: Models.Model,
    inputTokens: number,
    outputTokens: number
  ): { input: number; output: number; total: number } {
    if (!model.cost) {
      return { input: 0, output: 0, total: 0 };
    }

    const inputCost = (inputTokens / 1_000_000) * model.cost.input;
    const outputCost = (outputTokens / 1_000_000) * model.cost.output;
    
    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
    };
  }

  getRecommendedModels(task: 'coding' | 'chat' | 'analysis' | 'free'): Models.Model[] {
    // This would be implemented with more sophisticated logic
    // For now, return empty array as placeholder
    return [];
  }

  async refreshCatalog(): Promise<void> {
    this.cache = null;
    await this.getCatalog();
  }
}

export const modelsService = new ModelsService();
export type { ModelsService };
