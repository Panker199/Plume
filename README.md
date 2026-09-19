# Plume Coding Agent

A full-stack AI-powered desktop coding assistant built with Tauri (Rust) + React + Node.js.

**GitHub:** [https://github.com/Panker199/Plume](https://github.com/Panker199/Plume)

## Screenshots

### Login
![Login](screenshots/login.png)

## Features

- AI chat with streaming responses
- Dark/Light theme with custom accent colors
- Login/Signup with social auth (Google, GitHub)
- Quick actions: Debug, Write, Review, Explain code
- Settings panel with theme & accent color customization
- Responsive sidebar with conversation history

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop | Rust, Tauri 1.6 |
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js, Express 4, TypeScript |

## AI Models

| Model | Provider | Best For |
|-------|----------|----------|
| GPT-4o | OpenAI | General coding, complex tasks |
| GPT-4o Mini | OpenAI | Quick tasks, simple code |
| GPT-4 Turbo | OpenAI | Long context, detailed analysis |
| Claude 3.5 Sonnet | Anthropic | Code quality, safety |
| Claude 3 Haiku | Anthropic | Fast responses, simple tasks |
| DeepSeek Chat | DeepSeek | General purpose, cost-effective |
| DeepSeek Coder | DeepSeek | Code generation, technical tasks |
| HTTP Client | reqwest (Rust), fetch (Browser) |

## Project Structure

```
├── frontend/
│   ├── src/              # React components & styles
│   │   ├── App.tsx       # Main app layout & chat UI
│   │   ├── Auth.tsx      # Login/signup page
│   │   ├── Settings.tsx  # Settings modal
│   │   ├── ThemeContext.tsx # Theme & accent color provider
│   │   └── ColorPicker.tsx # Accent color picker
│   ├── src-tauri/        # Rust backend (Tauri commands)
│   │   ├── src/main.rs   # IPC commands (send_message, etc.)
│   │   └── tauri.conf.json
│   ├── index.html
│   └── vite.config.ts
├── backend/
│   └── src/server.ts     # Express API server
├── package.json          # Root scripts (concurrently)
└── README.md
```

## Prerequisites

- Node.js v18+
- Rust (latest stable)
- Tauri CLI (`cargo install tauri-cli`)

## Getting Started

```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend
npm run dev
```

Or run separately:

```bash
npm run dev:backend    # Express server on port 3001
npm run dev:frontend   # Tauri dev window (Vite on 5173)
```

## Build

```bash
npm run build
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/conversations` | List all conversations |
| POST | `/api/conversations` | Create new conversation |
| GET | `/api/conversations/:id` | Get conversation by ID |
| DELETE | `/api/conversations/:id` | Delete conversation |
| POST | `/api/conversations/:id/messages` | Add message to conversation |
| POST | `/api/chat` | Chat with SSE streaming |
