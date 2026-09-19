"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelsService = void 0;
const models_1 = require("@opencode-ai/models");
class ModelsService {
    constructor() {
        this.cache = null;
        this.CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
        this.client = models_1.Models.make({
            baseUrl: 'https://models.dev',
        });
    }
    async getCatalog() {
        if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
            return this.cache.data;
        }
        try {
            const catalog = await this.client.catalog();
            this.cache = { data: catalog, timestamp: Date.now() };
            return catalog;
        }
        catch (error) {
            console.error('Failed to fetch models.dev catalog:', error);
            if (this.cache) {
                return this.cache.data;
            }
            throw error;
        }
    }
    async getOpenRouterModels() {
        const catalog = await this.getCatalog();
        const openrouterProvider = catalog.providers['openrouter'];
        if (!openrouterProvider) {
            return [];
        }
        return Object.values(openrouterProvider.models);
    }
    async getFreeModels() {
        const models = await this.getOpenRouterModels();
        return models.filter(model => model.cost && model.cost.input === 0 && model.cost.output === 0);
    }
    async getCodingModels() {
        const models = await this.getOpenRouterModels();
        return models.filter(model => model.tool_call === true &&
            model.limit.context >= 32000);
    }
    async getReasoningModels() {
        const models = await this.getOpenRouterModels();
        return models.filter(model => model.reasoning === true);
    }
    async searchModels(query) {
        const models = await this.getOpenRouterModels();
        const lowerQuery = query.toLowerCase();
        return models.filter(model => model.name.toLowerCase().includes(lowerQuery) ||
            model.description.toLowerCase().includes(lowerQuery) ||
            model.id.toLowerCase().includes(lowerQuery));
    }
    async getModelById(id) {
        const models = await this.getOpenRouterModels();
        return models.find(model => model.id === id) || null;
    }
    async getModelMetadata(modelId) {
        const catalog = await this.getCatalog();
        const labModelId = modelId.split('/').slice(0, 2).join('/');
        return catalog.models[labModelId] || null;
    }
    estimateCost(model, inputTokens, outputTokens) {
        if (!model.cost) {
            return { input: 0, output: 0, total: 0 };
        }
        const inputCost = (inputTokens / 1000000) * model.cost.input;
        const outputCost = (outputTokens / 1000000) * model.cost.output;
        return {
            input: inputCost,
            output: outputCost,
            total: inputCost + outputCost,
        };
    }
    getRecommendedModels(task) {
        // This would be implemented with more sophisticated logic
        // For now, return empty array as placeholder
        return [];
    }
    async refreshCatalog() {
        this.cache = null;
        await this.getCatalog();
    }
}
exports.modelsService = new ModelsService();
//# sourceMappingURL=models-service.js.map