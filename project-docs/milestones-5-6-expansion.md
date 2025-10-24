# Expanded Milestones 5 & 6: API Integration

## Overview
Breaking down the API integration into small, testable sub-milestones to maintain development velocity while building a scalable, DRY architecture.

---

## Milestone 5: API Endpoint Foundation

### M5.1: Health Check Endpoint
**Goal**: Verify server setup and client-server communication works
**Changes**:
- Add `GET /api/health` endpoint in `server/routes.ts`
- Returns `{ status: "ok", timestamp: ISO string }`
- Create `client/src/lib/api.ts` with base fetch wrapper
- Test: Frontend can call endpoint and receive response

**Files**:
- `server/routes.ts` - Add health endpoint
- `client/src/lib/api.ts` - Create API client utility

**Test**:
```bash
curl http://localhost:5000/api/health
# Should return: {"status":"ok","timestamp":"2025-..."}
```

---

### M5.2: Chat Endpoint Stub (No AI)
**Goal**: Get request/response flow working with hardcoded data
**Changes**:
- Add `POST /api/chat` endpoint in `server/routes.ts`
- Accept `{ messages: Message[] }` in request body
- Return hardcoded coach response:
  ```json
  {
    "message": "This is a hardcoded response!",
    "suggestedReplies": ["Got it", "Tell me more", "Thanks"],
    "inputMode": "options"
  }
  ```
- Create `client/src/lib/chatApi.ts` for chat-specific API calls
- Test: Frontend sends message, receives hardcoded response

**Files**:
- `server/routes.ts` - Add POST /api/chat stub
- `client/src/lib/chatApi.ts` - Chat API client
- `client/src/types/chat.ts` - Chat type definitions

**Validation**:
- Request body is validated (has messages array)
- Returns 400 if invalid request
- Console logs incoming messages for debugging

---

### M5.3: Wire Chat UI to Stub Endpoint
**Goal**: Connect CoachChat component to real API
**Changes**:
- Add `isLoading` state to CoachChat
- Call `POST /api/chat` when user sends message (reply or custom)
- Append user message to conversation history
- Append coach response to conversation history
- Show loading indicator while waiting
- Handle errors gracefully

**Files**:
- `client/src/components/CoachChat.tsx` - Wire up API calls

**Test**:
- Select suggested reply → see loading → see hardcoded response
- Type custom message → see loading → see hardcoded response
- New messages appear in conversation history
- Can navigate back through history to see sent messages

---

## Milestone 6: OpenRouter Integration

### M6.1: OpenRouter Client Setup
**Goal**: Create reusable OpenRouter client with proper error handling
**Changes**:
- Create `server/lib/openrouter.ts` - OpenRouter API client
- Use `openai` npm package (compatible with OpenRouter)
- Configure with `OPENROUTER_API_KEY` from env
- Hardcode model: `anthropic/claude-4.5-haiku`
- Basic error handling (network, rate limits, invalid responses)
- Test with simple "Hello" message

**Files**:
- `server/lib/openrouter.ts` - OpenRouter client
- `.env.example` - Document OPENROUTER_API_KEY

**Validation**:
- Can successfully call OpenRouter API
- Errors are caught and logged
- Returns structured response

---

### M6.2: Response Format Instructions
**Goal**: Get OpenRouter to return structured responses with suggested replies
**Changes**:
- Create `server/lib/systemPrompt.ts` - System prompt builder
- Include response format instructions (JSON structure)
- Instruct AI to return `{ message, suggestedReplies, inputMode }`
- Update `/api/chat` to use OpenRouter client
- Parse AI response and extract fields
- Fallback to sensible defaults if fields missing

**Files**:
- `server/lib/systemPrompt.ts` - Prompt builder
- `server/routes.ts` - Update /api/chat to use OpenRouter

**Test**:
- Send "Hello" → receive AI greeting with suggested replies
- Send "How do I squat?" → receive exercise advice
- suggestedReplies array is populated
- inputMode is set appropriately

---

### M6.3: Context Passing (Workout Program)
**Goal**: Include workout program data in AI context
**Changes**:
- Update `POST /api/chat` to accept `context` in request body:
  ```typescript
  {
    messages: Message[],
    context: {
      workoutProgram: Week[],
      currentUrl: string,
      currentDate: string
    }
  }
  ```
- Update `systemPrompt.ts` to include workout program JSON
- Add context size optimization (minify JSON, limit to current week if >100kb)
- Wire CoachChat to pass workout program from `useWorkoutProgram` hook

**Files**:
- `server/lib/systemPrompt.ts` - Add context builder
- `server/routes.ts` - Accept context in request
- `client/src/lib/chatApi.ts` - Send context with requests
- `client/src/components/CoachChat.tsx` - Pass workout data

**Test**:
- Ask "What exercises are in my program?" → AI lists actual exercises
- Ask "What's my workout today?" → AI references actual sessions
- AI is aware of current week/phase

---

### M6.4: Error Handling & Loading States
**Goal**: Polish error handling and user feedback
**Changes**:
- Add error state to CoachChat
- Show user-friendly error messages (network failure, rate limit, etc)
- Add retry mechanism for transient errors
- Loading indicator with typing animation
- Timeout handling (15s max wait)

**Files**:
- `client/src/components/CoachChat.tsx` - Error states
- `server/lib/openrouter.ts` - Better error messages

**Test**:
- Disconnect internet → see error message
- Invalid API key → see error (in dev)
- Long response → see loading indicator
- Error doesn't break conversation history

---

## Architecture Decisions

### API Client Pattern (DRY)
```typescript
// client/src/lib/api.ts
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`/api${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return response.json();
}
```

### Chat API Wrapper
```typescript
// client/src/lib/chatApi.ts
import { apiRequest } from './api';

export async function sendChatMessage(
  messages: Message[],
  context: ChatContext
): Promise<ChatApiResponse> {
  return apiRequest('/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, context }),
  });
}
```

### Server Route Organization
```typescript
// server/routes.ts
import express from 'express';
import { chatHandler } from './routes/chat';

export function registerRoutes(app: Express) {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Chat endpoint
  app.post('/api/chat', chatHandler);

  return createServer(app);
}
```

```typescript
// server/routes/chat.ts (future organization)
export async function chatHandler(req: Request, res: Response) {
  // Validation
  // OpenRouter call
  // Response formatting
}
```

### OpenRouter Client Pattern
```typescript
// server/lib/openrouter.ts
export class OpenRouterClient {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    });
  }

  async chat(messages: ChatMessage[]): Promise<ChatResponse> {
    // Implementation
  }
}
```

---

## Type Definitions

### Shared Types (client/src/types/chat.ts)
```typescript
export interface Message {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
}

export interface ChatContext {
  workoutProgram: Week[];
  currentUrl: string;
  currentDate: string;
}

export interface ChatApiRequest {
  messages: Message[];
  context: ChatContext;
}

export interface ChatApiResponse {
  message: string;
  suggestedReplies?: string[];
  inputMode: 'options' | 'freeform';
}
```

---

## Testing Checklist

### M5.1 Tests
- [ ] Health endpoint returns 200
- [ ] Frontend can call health endpoint
- [ ] API client handles errors

### M5.2 Tests
- [ ] Chat endpoint accepts valid requests
- [ ] Chat endpoint rejects invalid requests (400)
- [ ] Response has expected shape
- [ ] Console logs incoming messages

### M5.3 Tests
- [ ] Selecting reply sends to API
- [ ] Custom text sends to API
- [ ] Loading state shows during request
- [ ] Response appears in conversation
- [ ] Can navigate through history

### M6.1 Tests
- [ ] OpenRouter client initializes
- [ ] Can send simple message
- [ ] Receives actual AI response
- [ ] Errors are caught and logged

### M6.2 Tests
- [ ] AI returns structured response
- [ ] suggestedReplies populated
- [ ] inputMode is set
- [ ] Handles missing fields gracefully

### M6.3 Tests
- [ ] AI knows about workout program
- [ ] Can reference specific exercises
- [ ] Aware of current week/phase
- [ ] Context size optimized

### M6.4 Tests
- [ ] Network errors show message
- [ ] Loading indicator works
- [ ] Timeout handling works
- [ ] Errors don't break UI

---

## Dependencies to Install

```json
{
  "dependencies": {
    "openai": "^4.0.0"
  }
}
```

Environment variables needed:
- `OPENROUTER_API_KEY` - API key for OpenRouter

---

## File Structure (Final)

```
server/
├── routes/
│   └── chat.ts              # Chat endpoint handler (M6+)
├── lib/
│   ├── openrouter.ts        # OpenRouter client (M6.1)
│   └── systemPrompt.ts      # Prompt builder (M6.2)
├── routes.ts                # Route registration (M5)
└── index.ts                 # Server setup (existing)

client/src/
├── lib/
│   ├── api.ts               # Base API client (M5.1)
│   └── chatApi.ts           # Chat API wrapper (M5.2)
├── types/
│   └── chat.ts              # Chat type definitions (M5.2)
└── components/
    └── CoachChat.tsx        # Chat UI (M5.3)
```

---

## Key Principles

1. **KISS**: Each sub-milestone adds ONE thing
2. **DRY**: Reusable API client, don't repeat fetch logic
3. **Testable**: Each milestone has clear pass/fail criteria
4. **Incremental**: Previous milestone stays working when adding next
5. **Scalable**: Architecture supports future features (streaming, tool calls)
6. **Fast Feedback**: Can test each piece independently

---

## Next Steps After M6

Once M5 & M6 are complete, we'll have:
- ✅ Working API communication
- ✅ Real AI responses
- ✅ Context-aware coaching
- ✅ Proper error handling

Ready for M7 (Tool Definitions) and beyond!
