import { Models } from '@opencode-ai/models';
declare class ModelsService {
    private cache;
    private readonly CACHE_TTL;
    private client;
    constructor();
    getCatalog(): Promise<Models.Catalog>;
    getOpenRouterModels(): Promise<Models.Model[]>;
    getFreeModels(): Promise<Models.Model[]>;
    getCodingModels(): Promise<Models.Model[]>;
    getReasoningModels(): Promise<Models.Model[]>;
    searchModels(query: string): Promise<Models.Model[]>;
    getModelById(id: string): Promise<Models.Model | null>;
    getModelMetadata(modelId: string): Promise<Models.ModelMetadata | null>;
    estimateCost(model: Models.Model, inputTokens: number, outputTokens: number): {
        input: number;
        output: number;
        total: number;
    };
    getRecommendedModels(task: 'coding' | 'chat' | 'analysis' | 'free'): Models.Model[];
    refreshCatalog(): Promise<void>;
}
export declare const modelsService: ModelsService;
export type { ModelsService };
//# sourceMappingURL=models-service.d.ts.map