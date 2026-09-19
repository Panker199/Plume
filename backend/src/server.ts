import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: ['http://localhost:1420', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost', 'http://localhost:80'],
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

interface Message { id: string; role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date; }
interface Conversation { id: string; title: string; messages: Message[]; createdAt: Date; updatedAt: Date; }

const conversations: Map<string, Conversation> = new Map();
let totalTokensUsed = 0;

const SYSTEM_PROMPT = `You are Plume, an expert AI coding assistant with full access to the user's computer via tools.

When you need to use a tool, output EXACTLY this format:
\`\`\`tool
tool_name arg1="value1" arg2="value2"
\`\`\`

TOOLS (your compiler/executor):
- shell command="any command" - Execute ANY command: compile, run, test, install, build
- file_read path="file.txt" - Read file contents
- file_write path="file.txt" content="..." - Write/create file
- file_list path="." - List directory
- file_edit path="file.txt" old="text" new="text" - Edit file (search/replace)
- git command="status" - Run git command
- github_repos - List your GitHub repos
- github_repo owner="user" repo="name" - Get repo info
- github_issues owner="user" repo="name" state="open" - List issues
- github_create_issue owner="user" repo="name" title="..." body="..." - Create issue
- github_pr owner="user" repo="name" state="open" - List pull requests
- github_create_pr owner="user" repo="name" title="..." body="..." head="branch" base="main" - Create PR
- github_search query="keyword" - Search repos
- github_file owner="user" repo="name" path="file.txt" - Read file from repo
- github_commits owner="user" repo="name" - List recent commits

COMPILER WORKFLOW:
1. Write code with file_write
2. Compile/run with shell (e.g., "python file.py", "node file.js", "gcc file.c -o file && ./file")
3. If error occurs, read error output, fix code with file_edit
4. Run again until it works
5. Always show the final output to the user

RULES:
1. DON'T just show code - WRITE files and RUN them
2. After writing code, ALWAYS compile and run it
3. Chain multiple tool calls: write -> compile -> fix -> run
4. Show command output to user
5. If compilation fails, analyze error and fix it
6. Be direct, code-first, no filler
7. Write COMPLETE files, never partial
8. Match user's language`;

const MODELS: Record<string, { id: string; provider: string }> = {
  'deepseek/deepseek-v4-flash-0731:free': { id: 'deepseek/deepseek-v4-flash-0731:free', provider: 'openrouter' },
  'nvidia/nemotron-3-5-lightning:free': { id: 'nvidia/nemotron-3-5-lightning:free', provider: 'openrouter' },
  'nvidia/nemotron-3-ultra:free': { id: 'nvidia/nemotron-3-ultra:free', provider: 'openrouter' },
  'qwen/qwen3.8-27b:free': { id: 'qwen/qwen3.8-27b:free', provider: 'openrouter' },
  'inclusionai/ling-3.0-flash-vl:free': { id: 'inclusionai/ling-3.0-flash-vl:free', provider: 'openrouter' },
  'nex-agi/nex-n2.5-pro:free': { id: 'nex-agi/nex-n2.5-pro:free', provider: 'openrouter' },
  'google/gemma-4-31b:free': { id: 'google/gemma-4-31b:free', provider: 'openrouter' },
  'nvidia/nemotron-3-super:free': { id: 'nvidia/nemotron-3-super:free', provider: 'openrouter' },
  'cohere/north-mini-code:free': { id: 'cohere/north-mini-code:free', provider: 'openrouter' },
  'dots-studio/dots3-note-preview:free': { id: 'dots-studio/dots3-note-preview:free', provider: 'openrouter' },
  'poolside/laguna-s-2.1:free': { id: 'poolside/laguna-s-2.1:free', provider: 'openrouter' },
  'liquid/lfm2.5-2.6b:free': { id: 'liquid/lfm2.5-2.6b:free', provider: 'openrouter' },
  'z-ai/glm-5.2:free': { id: 'z-ai/glm-5.2:free', provider: 'openrouter' },
  'openai/gpt-4.1': { id: 'openai/gpt-4.1', provider: 'openrouter' },
  'anthropic/claude-haiku-4.5': { id: 'anthropic/claude-haiku-4.5', provider: 'openrouter' },
  'google/gemini-3.7-flash': { id: 'google/gemini-3.7-flash', provider: 'openrouter' },
  'deepseek/deepseek-v3.2': { id: 'deepseek/deepseek-v3.2', provider: 'openrouter' },
};

// ========== TOOL EXECUTION ==========
function runShell(command: string): string {
  try {
    const out = execSync(command, { timeout: 30000, maxBuffer: 5*1024*1024, windowsHide: true, encoding: 'utf-8' });
    return out.trim() || '(no output)';
  } catch (e: any) { return [e.stdout, e.stderr, e.message].filter(Boolean).join('\n').trim(); }
}

function readFile(fp: string): string {
  try {
    const r = path.resolve(fp);
    if (!fs.existsSync(r)) return 'File not found: ' + fp;
    if (fs.statSync(r).isDirectory()) return 'Is directory: ' + fp;
    return fs.readFileSync(r, 'utf-8');
  } catch (e: any) { return 'Error: ' + e.message; }
}

function writeFile(fp: string, content: string): string {
  try {
    const r = path.resolve(fp);
    const dir = path.dirname(r);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(r, content, 'utf-8');
    return 'Written: ' + fp + ' (' + content.length + ' bytes)';
  } catch (e: any) { return 'Error: ' + e.message; }
}

function listDir(dp: string): string {
  try {
    const r = path.resolve(dp);
    if (!fs.existsSync(r)) return 'Not found: ' + dp;
    return fs.readdirSync(r, { withFileTypes: true }).map(i =>
      (i.isDirectory() ? '[DIR] ' : '      ') + i.name
    ).join('\n');
  } catch (e: any) { return 'Error: ' + e.message; }
}

function editFile(fp: string, old: string, nw: string): string {
  try {
    const r = path.resolve(fp);
    if (!fs.existsSync(r)) return 'Not found: ' + fp;
    const c = fs.readFileSync(r, 'utf-8');
    if (!c.includes(old)) return 'Text not found in ' + fp;
    fs.writeFileSync(r, c.replace(old, nw), 'utf-8');
    return 'Edited: ' + fp + ' (' + (c.split(old).length - 1) + ' replacements)';
  } catch (e: any) { return 'Error: ' + e.message; }
}

function executeTool(call: string, githubToken?: string): { name: string; result: string } {
  const lines = call.trim().split('\n');
  const first = lines[0].trim();
  const spaceIdx = first.indexOf(' ');
  const toolName = spaceIdx > 0 ? first.substring(0, spaceIdx) : first;
  const argsStr = spaceIdx > 0 ? first.substring(spaceIdx + 1) : '';

  const args: Record<string, string> = {};
  const re = /(\w+)="((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(argsStr)) !== null) {
    args[m[1]] = m[2].replace(/\\"/g, '"');
  }

  if (toolName === 'file_write' && !args.content && lines.length > 1) {
    args.content = lines.slice(1).join('\n');
  }
  if (toolName === 'file_edit' && !args.new && lines.length > 1) {
    const parts = lines.slice(1).join('\n').split('---NEW---');
    if (parts.length === 2) { args.old = parts[0].trim(); args.new = parts[1].trim(); }
  }

  switch (toolName) {
    case 'shell': return { name: 'shell', result: runShell(args.command || '') };
    case 'file_read': return { name: 'file_read', result: readFile(args.path || '') };
    case 'file_write': return { name: 'file_write', result: writeFile(args.path || '', args.content || '') };
    case 'file_list': return { name: 'file_list', result: listDir(args.path || '.') };
    case 'file_edit': return { name: 'file_edit', result: editFile(args.path || '', args.old || '', args.new || '') };
    case 'git': return { name: 'git', result: runShell('git ' + (args.command || 'status')) };
    case 'github_repos': return { name: 'github_repos', result: await githubApi('/user/repos?per_page=10&sort=updated', githubToken) };
    case 'github_repo': return { name: 'github_repo', result: await githubApi(`/repos/${args.owner}/${args.repo}`, githubToken) };
    case 'github_issues': return { name: 'github_issues', result: await githubApi(`/repos/${args.owner}/${args.repo}/issues?state=${args.state || 'open'}&per_page=10`, githubToken) };
    case 'github_create_issue': return { name: 'github_create_issue', result: await githubPost(`/repos/${args.owner}/${args.repo}/issues`, { title: args.title, body: args.body || '' }, githubToken) };
    case 'github_pr': return { name: 'github_pr', result: await githubApi(`/repos/${args.owner}/${args.repo}/pulls?state=${args.state || 'open'}&per_page=10`, githubToken) };
    case 'github_create_pr': return { name: 'github_create_pr', result: await githubPost(`/repos/${args.owner}/${args.repo}/pulls`, { title: args.title, body: args.body || '', head: args.head, base: args.base || 'main' }, githubToken) };
    case 'github_search': return { name: 'github_search', result: await githubApi(`/search/repositories?q=${encodeURIComponent(args.query || '')}&per_page=5`, githubToken) };
    case 'github_file': return { name: 'github_file', result: await githubApi(`/repos/${args.owner}/${args.repo}/contents/${args.path}?ref=${args.ref || 'main'}`, githubToken) };
    case 'github_commits': return { name: 'github_commits', result: await githubApi(`/repos/${args.owner}/${args.repo}/commits?per_page=10`, githubToken) };
    default: return { name: toolName, result: 'Unknown tool: ' + toolName };
  }
}

function extractToolCalls(text: string): string[] {
  const calls: string[] = [];
  const re = /```tool\s*\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(text)) !== null) calls.push(m[1]);
  return calls;
}

async function githubApi(endpoint: string, token?: string): Promise<string> {
  try {
    const t = token || '';
    const res = await fetch('https://api.github.com' + endpoint, {
      headers: { 'Authorization': 'Bearer ' + t, 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Plume-App' }
    });
    if (!res.ok) return 'GitHub API error: ' + res.status + ' ' + (await res.text()).slice(0, 200);
    const data = await res.json();
    return JSON.stringify(data, null, 2).slice(0, 3000);
  } catch (e: any) { return 'Error: ' + e.message; }
}

async function githubPost(endpoint: string, body: any, token?: string): Promise<string> {
  try {
    const t = token || '';
    const res = await fetch('https://api.github.com' + endpoint, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + t, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'Plume-App' },
      body: JSON.stringify(body)
    });
    if (!res.ok) return 'GitHub API error: ' + res.status + ' ' + (await res.text()).slice(0, 200);
    const data = await res.json();
    return JSON.stringify(data, null, 2).slice(0, 3000);
  } catch (e: any) { return 'Error: ' + e.message; }
}

// ========== API ENDPOINTS ==========
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'Plume', tokensUsed: totalTokensUsed }));
app.get('/api/models', (_req, res) => res.json(Object.keys(MODELS)));

app.get('/api/conversations', (_req, res) => {
  res.json(Array.from(conversations.values()).map(c => ({ id: c.id, title: c.title, messageCount: c.messages.length })));
});

app.post('/api/conversations', (req, res) => {
  const conv: Conversation = { id: uuidv4(), title: req.body.title || 'New', messages: [], createdAt: new Date(), updatedAt: new Date() };
  conversations.set(conv.id, conv);
  res.status(201).json(conv);
});

app.delete('/api/conversations/:id', (req, res) => { conversations.delete(req.params.id); res.json({ success: true }); });

// ========== STREAMING CHAT WITH TOOL LOOP ==========
const FALLBACK_MODELS = [
  'qwen/qwen3.7-flash',
  'deepseek/deepseek-v4-flash',
  'google/gemini-3.7-flash',
  'qwen/qwen3.8-2.4t-a95b',
  'meta-llama/llama-4-maverick',
  'nvidia/nemotron-3-ultra:free',
  'inclusionai/ling-3.0-flash:free',
  'qwen/qwen3.8-27b:free',
];;

app.post('/api/chat', async (req, res) => {
  const { message, model, apiKey, history, mode, githubToken } = req.body;
  if (!apiKey) return res.status(400).json({ error: 'API key required.' });

  const modelInfo = MODELS[model];
  let selectedModelId: string;
  if (modelInfo) {
    selectedModelId = modelInfo.id;
  } else if (model && model.includes('/')) {
    selectedModelId = model;
  } else {
    selectedModelId = 'openai/gpt-4o';
  }

  const modelsToTry = model === 'auto'
    ? [...FALLBACK_MODELS]
    : [selectedModelId];

  const modePrompts: Record<string, string> = {
    chat: '\n\nMODE: CHAT - Normal conversation. Answer questions, discuss code, help with ideas. Do NOT auto-execute code unless user specifically asks to run/compile something. Use tools only when explicitly requested.',
    code: '\n\nMODE: CODE - Write code and EXECUTE it. After writing any code file, IMMEDIATELY compile and run it using shell tool. Show the output. Workflow: write file -> compile/run -> show result -> fix if error -> run again.',
    debug: '\n\nMODE: DEBUG - Debugging workflow: 1) Read the buggy code with file_read, 2) Run it with shell to see the error, 3) Analyze the error, 4) Fix with file_edit, 5) Run again to verify fix. Always run code to confirm the bug and confirm the fix.',
    agent: '\n\nMODE: AGENT - Full autonomous agent. Use ALL tools without asking. Explore codebase, read files, write files, compile, run, test, fix errors. Do everything automatically. Chain multiple tool calls. Be proactive.',
    explain: '\n\nMODE: EXPLAIN - Explain code step by step. Read the code with file_read, then explain what each part does. If code can be run, run it with shell to show output. Make explanations clear and educational.',
  };

  const systemPrompt = SYSTEM_PROMPT + (modePrompts[mode || 'chat'] || '');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const MAX_ROUNDS = 10;
  let fullHistory: any[] = [...(history || []), { role: 'user', content: message }];

  try {
    for (let round = 0; round < MAX_ROUNDS; round++) {
      let lastError = '';
      let success = false;
      let fullContent = '';

      for (const tryModel of modelsToTry) {
        res.write('data: ' + JSON.stringify({ trying: tryModel }) + '\n\n');

        const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey,
            'HTTP-Referer': 'https://plume.app',
            'X-Title': 'Plume Coding Agent',
          },
          body: JSON.stringify({
            model: tryModel,
            messages: [{ role: 'system', content: systemPrompt }, ...fullHistory],
            max_tokens: 4096,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          try { lastError = JSON.parse(errText).error?.message || 'API error'; } catch { lastError = 'API error'; }

          if (response.status === 401) {
            lastError = 'Invalid API key. Check your key in Settings.';
            break;
          }
          if (response.status === 402) {
            continue;
          }
          if (response.status === 429) {
            if (lastError.includes('free-models-per-day') || lastError.includes('daily')) {
              continue;
            }
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          if (response.status === 403) {
            continue;
          }
          continue;
        }

        success = true;
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const chunk = parsed.choices?.[0]?.delta?.content;
              if (chunk) {
                fullContent += chunk;
                totalTokensUsed++;
                res.write('data: ' + JSON.stringify({ content: chunk }) + '\n\n');
              }
            } catch {}
          }
        }
        break;
      }

      if (!success) {
        const finalError = lastError.includes('free-models-per-day') 
          ? 'Daily free model limit reached. Add $10 at https://openrouter.ai/settings/credits to unlock 1000 free requests/day.'
          : lastError || 'All models failed. Check your API key and credits.';
        res.write('data: ' + JSON.stringify({ error: finalError }) + '\n\n');
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      const toolCalls = extractToolCalls(fullContent);
      if (toolCalls.length === 0) {
        res.write('data: ' + JSON.stringify({ done: true, tokens: totalTokensUsed }) + '\n\n');
        return res.end();
      }

      fullHistory.push({ role: 'assistant', content: fullContent });

      let toolResults = '';
      for (const call of toolCalls) {
        const result = executeTool(call, githubToken);
        const toolLabel = result.name;
        res.write('data: ' + JSON.stringify({ tool_call: { name: toolLabel, input: call.split('\n')[0], result: result.result } }) + '\n\n');
        toolResults += '\n[TOOL_RESULT:' + toolLabel + ']\n' + result.result + '\n[/TOOL_RESULT]\n';
      }
      fullHistory.push({ role: 'user', content: 'Tool results:\n' + toolResults + '\nContinue your response with the results above.' });
    }

    res.write('data: ' + JSON.stringify({ content: '\n\n(Max tool rounds reached)' }) + '\n\n');
    res.write('data: ' + JSON.stringify({ done: true, tokens: totalTokensUsed }) + '\n\n');
    res.end();
  } catch (err: any) {
    res.write('data: ' + JSON.stringify({ error: err.message || 'Network error' }) + '\n\n');
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// Shell endpoint (standalone)
app.post('/api/shell', async (req, res) => {
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: 'Command required' });
  try {
    const out = runShell(cwd ? `cd ${cwd} && ${command}` : command);
    res.json({ output: out, exitCode: 0 });
  } catch (e: any) {
    res.json({ output: e.message, exitCode: 1 });
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log('Plume Backend running on http://localhost:' + PORT);
});
