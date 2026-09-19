"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const models_service_1 = require("./models-service");
const router = (0, express_1.Router)();
// GET /api/models/dev - Get models.dev catalog
router.get('/dev', async (_req, res) => {
    try {
        const catalog = await models_service_1.modelsService.getCatalog();
        res.json({
            providers: Object.keys(catalog.providers).length,
            models: Object.keys(catalog.models).length,
            timestamp: Date.now(),
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/models/dev/openrouter - Get OpenRouter models
router.get('/dev/openrouter', async (_req, res) => {
    try {
        const models = await models_service_1.modelsService.getOpenRouterModels();
        res.json(models.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            context: m.limit.context,
            output: m.limit.output,
            cost: m.cost,
            tool_call: m.tool_call,
            reasoning: m.reasoning,
        })));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/models/dev/free - Get free models
router.get('/dev/free', async (_req, res) => {
    try {
        const models = await models_service_1.modelsService.getFreeModels();
        res.json(models.map(m => ({
            id: m.id,
            name: m.name,
            context: m.limit.context,
            tool_call: m.tool_call,
        })));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/models/dev/coding - Get coding models
router.get('/dev/coding', async (_req, res) => {
    try {
        const models = await models_service_1.modelsService.getCodingModels();
        res.json(models.map(m => ({
            id: m.id,
            name: m.name,
            context: m.limit.context,
            cost: m.cost,
        })));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/models/dev/search?q=query - Search models
router.get('/dev/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter q is required' });
        }
        const models = await models_service_1.modelsService.searchModels(query);
        res.json(models.map(m => ({
            id: m.id,
            name: m.name,
            context: m.limit.context,
            cost: m.cost,
        })));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/models/dev/recommend?task=coding|chat|analysis - Get recommendations
router.get('/dev/recommend', async (req, res) => {
    try {
        const task = req.query.task || 'chat';
        const freeOnly = req.query.free === 'true';
        let models = await models_service_1.modelsService.getFreeModels();
        if (freeOnly) {
            models = models.filter(m => m.cost && m.cost.input === 0 && m.cost.output === 0);
        }
        let recommended = [];
        switch (task) {
            case 'coding':
                recommended = models
                    .filter(m => m.tool_call)
                    .sort((a, b) => (b.limit?.context || 0) - (a.limit?.context || 0))
                    .slice(0, 5)
                    .map(m => ({ id: m.id, name: m.name, reason: 'Tool calling support, large context', context: m.limit.context, cost: m.cost }));
                break;
            case 'analysis':
                recommended = models
                    .filter(m => m.reasoning)
                    .sort((a, b) => (b.limit?.context || 0) - (a.limit?.context || 0))
                    .slice(0, 5)
                    .map(m => ({ id: m.id, name: m.name, reason: 'Reasoning capabilities', context: m.limit.context, cost: m.cost }));
                break;
            case 'fast':
                recommended = models
                    .sort((a, b) => (a.limit?.context || 0) - (b.limit?.context || 0))
                    .slice(0, 5)
                    .map(m => ({ id: m.id, name: m.name, reason: 'Smaller context = faster responses', context: m.limit.context, cost: m.cost }));
                break;
            default: // chat
                recommended = models
                    .sort((a, b) => (b.limit?.context || 0) - (a.limit?.context || 0))
                    .slice(0, 5)
                    .map(m => ({ id: m.id, name: m.name, reason: 'Large context for conversation', context: m.limit.context, cost: m.cost }));
        }
        res.json({ task, models: recommended });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// GET /api/models/dev/:id - Get specific model
router.get('/dev/:id', async (req, res) => {
    try {
        const model = await models_service_1.modelsService.getModelById(req.params.id);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        res.json({
            id: model.id,
            name: model.name,
            description: model.description,
            context: model.limit.context,
            output: model.limit.output,
            cost: model.cost,
            tool_call: model.tool_call,
            reasoning: model.reasoning,
            modalities: model.modalities,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/models/dev/estimate - Estimate cost
router.post('/dev/estimate', async (req, res) => {
    try {
        const { modelId, inputTokens, outputTokens } = req.body;
        const model = await models_service_1.modelsService.getModelById(modelId);
        if (!model) {
            return res.status(404).json({ error: 'Model not found' });
        }
        const estimate = models_service_1.modelsService.estimateCost(model, inputTokens, outputTokens);
        res.json(estimate);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// POST /api/models/dev/refresh - Refresh catalog
router.post('/dev/refresh', async (_req, res) => {
    try {
        await models_service_1.modelsService.refreshCatalog();
        res.json({ success: true, message: 'Catalog refreshed' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=models-routes.js.map