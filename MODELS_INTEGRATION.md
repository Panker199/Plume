# Plume Code + models.dev Integration Design

## Overview
Integration of models.dev catalog with Plume Code for dynamic model discovery, pricing, and capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Plume Code App                        │
├─────────────────────────────────────────────────────────┤
│  Frontend (React)                                       │
│  ├── Dynamic model selector (from models.dev)           │
│  ├── Model capabilities display                         │
│  ├── Pricing info                                       │
│  └── Provider branding                                  │
├─────────────────────────────────────────────────────────┤
│  Backend (Express)                                      │
│  ├── /api/models/dev - models.dev catalog endpoint      │
│  ├── /api/models/recommend - AI model recommendations   │
│  ├── /api/models/search - search models by capability   │
│  └── /api/chat - enhanced with model metadata           │
├─────────────────────────────────────────────────────────┤
│  models.dev SDK (@opencode-ai/models)                   │
│  ├── providers() - all providers with pricing           │
│  ├── models() - model metadata                          │
│  └── catalog() - combined data                          │
└─────────────────────────────────────────────────────────┘
```

## Key Features

### 1. Dynamic Model Discovery
- Fetch models from models.dev API on startup
- Cache catalog locally (refresh every 24h)
- Filter models compatible with OpenRouter

### 2. Model Capabilities Display
- Tool calling support
- Reasoning capabilities
- Context window size
- Supported modalities (text, image, audio)

### 3. Pricing Information
- Cost per million tokens (input/output)
- Free tier indicators
- Cost estimates for conversations

### 4. Smart Recommendations
- Recommend models based on task type
- Auto-select best free model
- Fallback chain based on capabilities

## Implementation Plan

### Phase 1: Backend Integration
1. Add models.dev SDK dependency
2. Create models service with caching
3. Add new API endpoints
4. Update chat endpoint with model metadata

### Phase 2: Frontend Integration
1. Dynamic model selector component
2. Model capabilities display
3. Pricing information UI
4. Provider branding

### Phase 3: Enhanced Features
1. Model search and filter
2. Cost estimation
3. Usage tracking
4. Model performance metrics

## API Endpoints

### GET /api/models/dev
Returns models.dev catalog filtered for OpenRouter compatibility.

### GET /api/models/dev/openrouter
Returns all OpenRouter models with capabilities and pricing.

### GET /api/models/dev/free
Returns only free models (cost.input = 0, cost.output = 0).

### GET /api/models/dev/coding
Returns models with tool_call = true (suitable for coding tasks).

### GET /api/models/dev/search?q=query
Search models by name, ID, or description.

### GET /api/models/dev/recommend?task=coding|chat|analysis|fast&free=true
Returns recommended models for specific task types:
- **coding**: Models with tool_call = true, sorted by context size
- **analysis**: Models with reasoning = true, sorted by context size
- **fast**: Models with smallest context (faster responses)
- **chat**: Models with largest context for conversation

### POST /api/models/dev/estimate
Estimate cost for a conversation based on model and token count.

```json
{
  "modelId": "deepseek/deepseek-v4-flash-0731:free",
  "inputTokens": 1000,
  "outputTokens": 500
}
```

Response:
```json
{
  "model": "DeepSeek V4 Flash",
  "inputCost": 0,
  "outputCost": 0,
  "totalCost": 0,
  "currency": "USD"
}
```

### POST /api/models/dev/refresh
Force refresh the models.dev catalog cache.

## Model Filtering Rules

1. **OpenRouter Compatible**: Only include models available on OpenRouter
2. **Free Tier**: Mark models with cost.input = 0 as free
3. **Tool Calling**: Filter models with tool_call = true for coding tasks
4. **Context Size**: Prioritize models with larger context windows
5. **Reasoning**: Highlight reasoning models for complex tasks

## Caching Strategy

- Cache models.dev catalog for 24 hours
- Store in memory for fast access
- Refresh on backend restart
- Manual refresh endpoint available

## Error Handling

- Fallback to hardcoded models if models.dev API fails
- Graceful degradation for missing model data
- Log errors for monitoring

## Testing

1. Unit tests for models service
2. Integration tests for API endpoints
3. E2E tests for model selection UI
4. Performance tests for catalog caching

---

## Implementation Status

### Phase 1: Backend Integration ✅ COMPLETED
- [x] Add models.dev SDK dependency
- [x] Create models service with caching (`backend/src/models-service.ts`)
- [x] Add new API endpoints (`backend/src/models-routes.ts`)
- [x] Update chat endpoint with model metadata

### Phase 2: Frontend Integration ✅ COMPLETED
- [x] Dynamic model selector component (`frontend/src/ModelSelector.tsx`)
- [x] Model capabilities display (tool_call, reasoning badges)
- [x] Pricing information UI (free/paid indicators)
- [x] Provider branding (tested badge)

### Phase 3: Enhanced Features ✅ COMPLETED
- [x] Model search and filter (search box + filter buttons)
- [x] Cost estimation (POST /api/models/dev/estimate)
- [x] Usage tracking (token count in chat)
- [x] Smart recommendations (GET /api/models/dev/recommend)

### Free Models Added (25 total)
1. DeepSeek V4 Flash (1M context)
2. Nemotron 3 Ultra (1M context)
3. Nemotron 3.5 Lightning (1M context)
4. Nemotron 3 Super (262K context)
5. Nemotron 3 Nano Omni (256K context)
6. Nemotron 3.5 Content Safety (128K context)
7. Qwen3.8 27B (262K context)
8. Ling 3.0 Flash VL (262K context)
9. Ling 3.0 Flash Sante (262K context)
10. Ling 3.0 Flash Fin (262K context)
11. Gemma 4 31B (262K context)
12. Gemma 4 26B A4B (262K context)
13. Inkling (1M context)
14. Inkling Small (1M context)
15. North Mini Code (256K context)
16. GLM 5.2 (32K context)
17. Laguna S 2.1 (262K context)
18. Laguna XS 2.1 (262K context)
19. Dots3-Note Preview (512K context)
20. Nex-N2.5-Pro (262K context)
21. Nex-N2.5-Mini (262K context)
22. LFM2.5-2.6B (65K context)
23. Lyria 3 Clip Preview (1M context)
24. Lyria 3 Pro Preview (1M context)
25. Free Models Router (200K context)
