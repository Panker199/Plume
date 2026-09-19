import { Router, Request, Response } from 'express';
import { modelsService } from './models-service';

const router = Router();

// GET /api/models/dev - Get models.dev catalog
router.get('/dev', async (_req: Request, res: Response) => {
  try {
    const catalog = await modelsService.getCatalog();
    res.json({
      providers: Object.keys(catalog.providers).length,
      models: Object.keys(catalog.models).length,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/models/dev/openrouter - Get OpenRouter models
router.get('/dev/openrouter', async (_req: Request, res: Response) => {
  try {
    const models = await modelsService.getOpenRouterModels();
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/models/dev/free - Get free models
router.get('/dev/free', async (_req: Request, res: Response) => {
  try {
    const models = await modelsService.getFreeModels();
    res.json(models.map(m => ({
      id: m.id,
      name: m.name,
      context: m.limit.context,
      tool_call: m.tool_call,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/models/dev/coding - Get coding models
router.get('/dev/coding', async (_req: Request, res: Response) => {
  try {
    const models = await modelsService.getCodingModels();
    res.json(models.map(m => ({
      id: m.id,
      name: m.name,
      context: m.limit.context,
      cost: m.cost,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/models/dev/search?q=query - Search models
router.get('/dev/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    const models = await modelsService.searchModels(query);
    res.json(models.map(m => ({
      id: m.id,
      name: m.name,
      context: m.limit.context,
      cost: m.cost,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/models/dev/recommend?task=coding|chat|analysis - Get recommendations
router.get('/dev/recommend', async (req: Request, res: Response) => {
  try {
    const task = (req.query.task as string) || 'chat';
    const freeOnly = req.query.free === 'true';
    let models = await modelsService.getFreeModels();
    
    if (freeOnly) {
      models = models.filter(m => m.cost && m.cost.input === 0 && m.cost.output === 0);
    }

    let recommended: any[] = [];
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/models/dev/:id - Get specific model
router.get('/dev/:id', async (req: Request, res: Response) => {
  try {
    const model = await modelsService.getModelById(req.params.id);
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/models/dev/estimate - Estimate cost
router.post('/dev/estimate', async (req: Request, res: Response) => {
  try {
    const { modelId, inputTokens, outputTokens } = req.body;
    const model = await modelsService.getModelById(modelId);
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    const estimate = modelsService.estimateCost(model, inputTokens, outputTokens);
    res.json(estimate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/models/dev/refresh - Refresh catalog
router.post('/dev/refresh', async (_req: Request, res: Response) => {
  try {
    await modelsService.refreshCatalog();
    res.json({ success: true, message: 'Catalog refreshed' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
