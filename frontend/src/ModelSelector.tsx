import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { Search, Filter, Zap, Brain, Code, MessageSquare, DollarSign, X, Check, AlertCircle } from 'lucide-react';
import './ModelSelector.css';

interface Model {
  id: string;
  name: string;
  description?: string;
  context?: number;
  output?: number;
  cost?: {
    input: number;
    output: number;
  };
  tool_call?: boolean;
  reasoning?: boolean;
  modalities?: {
    input: string[];
    output: string[];
  };
}

interface ModelSelectorProps {
  onSelect: (modelId: string) => void;
  selectedModel?: string;
  showPricing?: boolean;
}

type FilterType = 'all' | 'free' | 'coding' | 'reasoning' | 'fast' | 'tested' | 'recommended';

// Tested models from models.dev (verified free on OpenRouter)
const TESTED_MODELS: Model[] = [
  { id: 'deepseek/deepseek-v4-flash-0731:free', name: 'DeepSeek V4 Flash', context: 1048576, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra', context: 1000000, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'nvidia/nemotron-3.5-lightning:free', name: 'Nemotron 3.5 Lightning', context: 1000000, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'Nemotron 3 Nano Omni', context: 256000, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'nvidia/nemotron-3.5-content-safety:free', name: 'Nemotron 3.5 Content Safety', context: 128000, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'qwen/qwen3.8-27b:free', name: 'Qwen3.8 27B', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'inclusionai/ling-3.0-flash-vl:free', name: 'Ling 3.0 Flash VL', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'inclusionai/ling-3.0-flash-sante:free', name: 'Ling 3.0 Flash Sante', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'inclusionai/ling-3.0-flash-fin:free', name: 'Ling 3.0 Flash Fin', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 26B A4B', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'thinkingmachines/inkling:free', name: 'Inkling', context: 1048576, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small', context: 1048576, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'cohere/north-mini-code:free', name: 'North Mini Code', context: 256000, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'z-ai/glm-5.2:free', name: 'GLM 5.2', context: 32768, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'poolside/laguna-s-2.1:free', name: 'Laguna S 2.1', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'poolside/laguna-xs-2.1:free', name: 'Laguna XS 2.1', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots3-Note Preview', context: 512000, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'nex-agi/nex-n2.5-pro:free', name: 'Nex-N2.5-Pro', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'nex-agi/nex-n2.5-mini:free', name: 'Nex-N2.5-Mini', context: 262144, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'liquid/lfm-2.5-2.6b:free', name: 'LFM2.5-2.6B', context: 65536, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
  { id: 'google/lyria-3-clip-preview', name: 'Lyria 3 Clip Preview', context: 1048576, cost: { input: 0, output: 0 }, tool_call: false, reasoning: false },
  { id: 'google/lyria-3-pro-preview', name: 'Lyria 3 Pro Preview', context: 1048576, cost: { input: 0, output: 0 }, tool_call: false, reasoning: false },
  { id: 'openrouter/free', name: 'Free Models Router', context: 200000, cost: { input: 0, output: 0 }, tool_call: true, reasoning: false },
];

const formatCost = (cost?: { input: number; output: number }) => {
  if (!cost) return 'N/A';
  if (cost.input === 0 && cost.output === 0) return 'Free';
  return `$${cost.input.toFixed(2)}/$${cost.output.toFixed(2)} per MTok`;
};

const formatContext = (context?: number) => {
  if (!context) return 'N/A';
  if (context >= 1000000) return `${(context / 1000000).toFixed(1)}M`;
  if (context >= 1000) return `${Math.round(context / 1000)}K`;
  return context.toString();
};

// Memoized model item - only re-renders when props change
const ModelItem = memo(({ model, isSelected, isTested, showDetails, onSelect, onToggleDetails }: {
  model: Model;
  isSelected: boolean;
  isTested: boolean;
  showDetails: boolean;
  onSelect: (id: string) => void;
  onToggleDetails: (id: string) => void;
}) => {
  const handleClick = useCallback(() => onSelect(model.id), [model.id, onSelect]);
  const handleDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleDetails(model.id);
  }, [model.id, onToggleDetails]);

  return (
    <div
      className={`model-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="model-header">
        <span className="model-name">{model.name}</span>
        {isTested && (
          <span className="model-badge tested">
            <Check size={10} /> Tested
          </span>
        )}
        {model.cost?.input === 0 && model.cost?.output === 0 && (
          <span className="model-badge free">Free</span>
        )}
        {model.tool_call && (
          <span className="model-badge coding">Tools</span>
        )}
        {model.reasoning && (
          <span className="model-badge reasoning">Reasoning</span>
        )}
      </div>
      
      <div className="model-meta">
        <span className="model-context">
          {formatContext(model.context)} context
        </span>
        <span className="model-cost">
          {formatCost(model.cost)}
        </span>
      </div>

      {showDetails && model.description && (
        <div className="model-description">
          {model.description}
        </div>
      )}

      <button
        className="model-details-btn"
        onClick={handleDetails}
      >
        {showDetails ? 'Hide' : 'Details'}
      </button>
    </div>
  );
});

ModelItem.displayName = 'ModelItem';

export default function ModelSelector({ 
  onSelect, 
  selectedModel, 
  showPricing = true 
}: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>(TESTED_MODELS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('recommended');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'tested' | 'dev' | 'openrouter'>('tested');
  const [recommendations, setRecommendations] = useState<{ task: string; models: any[] } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchRecommendations('coding');
  }, []);

  const fetchRecommendations = useCallback(async (task: string = 'coding') => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/models/dev/recommend?task=${task}&free=true`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      const data = await response.json();
      setRecommendations(data);
      setFilter('recommended');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModelsDev = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://models.dev/models.json');
      if (!response.ok) throw new Error('Failed to fetch from models.dev');
      const data = await response.json();
      
      const formattedModels: Model[] = Object.entries(data)
        .filter(([, model]: [string, any]) => {
          const cost = model.cost;
          return cost && cost.input === 0 && cost.output === 0;
        })
        .slice(0, 100)
        .map(([id, model]: [string, any]) => ({
          id,
          name: model.name || id.split('/').pop() || id,
          description: model.description,
          context: model.limit?.context || 128000,
          output: model.limit?.output || 4096,
          cost: { input: 0, output: 0 },
          tool_call: model.tool_call || false,
          reasoning: model.reasoning || false,
        }));
      
      setModels(formattedModels.length > 0 ? formattedModels : TESTED_MODELS);
      setDataSource('dev');
    } catch (err: any) {
      setError(err.message);
      setModels(TESTED_MODELS);
      setDataSource('tested');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOpenRouter = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/models/dev/openrouter');
      if (!response.ok) throw new Error('Failed to fetch from OpenRouter');
      const data = await response.json();
      const freeModels = data.filter((m: any) => 
        m.cost?.input === 0 && m.cost?.output === 0
      );
      setModels(freeModels.length > 0 ? freeModels : TESTED_MODELS);
      setDataSource('openrouter');
    } catch (err: any) {
      setError(err.message);
      setModels(TESTED_MODELS);
      setDataSource('tested');
    } finally {
      setLoading(false);
    }
  }, []);

  const resetToTested = useCallback(() => {
    setModels(TESTED_MODELS);
    setDataSource('tested');
    setError(null);
  }, []);

  const handleToggleDetails = useCallback((id: string) => {
    setShowDetails(prev => prev === id ? null : id);
  }, []);

  const filteredModels = useMemo(() => {
    let result = models;

    if (filter === 'recommended' && recommendations) {
      result = recommendations.models.map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.reason,
        context: m.context,
        cost: m.cost,
        tool_call: true,
        reasoning: false,
      }));
    }

    if (filter === 'tested') {
      result = TESTED_MODELS;
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(model =>
        model.name.toLowerCase().includes(lowerSearch) ||
        model.id.toLowerCase().includes(lowerSearch) ||
        model.description?.toLowerCase().includes(lowerSearch)
      );
    }

    if (filter !== 'tested' && filter !== 'recommended') {
      switch (filter) {
        case 'free':
          result = result.filter(model => model.cost?.input === 0 && model.cost?.output === 0);
          break;
        case 'coding':
          result = result.filter(model => model.tool_call === true && model.cost?.input === 0 && model.cost?.output === 0);
          break;
        case 'reasoning':
          result = result.filter(model => model.reasoning === true && model.cost?.input === 0 && model.cost?.output === 0);
          break;
        case 'fast':
          result = result.filter(model => (model.context || 0) <= 100000 && model.cost?.input === 0 && model.cost?.output === 0);
          break;
      }
    }

    result = result.filter(model => model.cost?.input === 0 && model.cost?.output === 0);

    return result.sort((a, b) => (b.context || 0) - (a.context || 0));
  }, [models, search, filter, recommendations]);

  if (loading) {
    return (
      <div className="model-selector loading">
        <div className="loading-spinner" />
        <span>Loading models from models.dev...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="model-selector error">
        <AlertCircle size={16} />
        <span>Error: {error}</span>
        <button onClick={resetToTested}>Use Tested Models</button>
      </div>
    );
  }

  return (
    <div className="model-selector">
      <div className="selector-header">
        <h3>Select Model</h3>
        <div className="selector-header-right">
          <span className={`data-source-badge ${dataSource}`}>
            {dataSource === 'tested' && <Check size={12} />}
            {dataSource === 'tested' ? 'Tested' : dataSource === 'dev' ? 'models.dev' : 'OpenRouter'}
          </span>
          <span className="model-count">{filteredModels.length} models</span>
        </div>
      </div>

      <div className="selector-search">
        <Search size={16} />
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="clear-search" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="selector-filters">
        <button
          className={`filter-btn ${filter === 'recommended' ? 'active' : ''}`}
          onClick={() => fetchRecommendations('coding')}
        >
          <Zap size={14} />
          Recommended
        </button>
        <button
          className={`filter-btn ${filter === 'tested' ? 'active' : ''}`}
          onClick={() => setFilter('tested')}
        >
          <Check size={14} />
          Tested
        </button>
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <Filter size={14} />
          All
        </button>
        <button
          className={`filter-btn ${filter === 'free' ? 'active' : ''}`}
          onClick={() => setFilter('free')}
        >
          <DollarSign size={14} />
          Free
        </button>
        <button
          className={`filter-btn ${filter === 'coding' ? 'active' : ''}`}
          onClick={() => setFilter('coding')}
        >
          <Code size={14} />
          Coding
        </button>
        <button
          className={`filter-btn ${filter === 'reasoning' ? 'active' : ''}`}
          onClick={() => setFilter('reasoning')}
        >
          <Brain size={14} />
          Reasoning
        </button>
      </div>

      <div className="selector-source-buttons">
        <button className="source-btn" onClick={resetToTested}>
          <Check size={12} /> Tested Models
        </button>
        <button className="source-btn" onClick={fetchModelsDev}>
          <Zap size={12} /> models.dev
        </button>
        <button className="source-btn" onClick={fetchOpenRouter}>
          <Zap size={12} /> OpenRouter
        </button>
      </div>

      <div className="selector-list" ref={listRef}>
        {filteredModels.map(model => (
          <ModelItem
            key={model.id}
            model={model}
            isSelected={selectedModel === model.id}
            isTested={TESTED_MODELS.some(t => t.id === model.id)}
            showDetails={showDetails === model.id}
            onSelect={onSelect}
            onToggleDetails={handleToggleDetails}
          />
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="no-models">
          No models found matching your criteria
        </div>
      )}

      <div className="selector-footer">
        <span className="models-dev-info">364+ models from models.dev</span>
        <button className="models-dev-refresh-btn" onClick={fetchModelsDev}>
          <Zap size={12} /> Refresh
        </button>
      </div>
    </div>
  );
}
