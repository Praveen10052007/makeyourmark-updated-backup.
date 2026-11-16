import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '4mb' }));

// Safe CORS & preflight handling for custom API origins or preview frames
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// ============================================================================
// 1. MULTI-PROVIDER AI CONFIGURATION (SERVER-SIDE ONLY)
// ============================================================================
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const openAiApiKey = process.env.OPENAI_API_KEY || '';
const anthropicApiKey = process.env.ANTHROPIC_API_KEY || '';
const youtubeApiKey = process.env.YOUTUBE_API_KEY || '';
const liveJobsApiKey = process.env.LIVE_JOBS_API_KEY || '';

const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY');
const hasOpenAiKey = Boolean(openAiApiKey && openAiApiKey !== 'MY_OPENAI_API_KEY' && openAiApiKey.startsWith('sk-'));
const hasAnthropicKey = Boolean(anthropicApiKey && anthropicApiKey !== 'MY_ANTHROPIC_API_KEY');
const hasYoutubeKey = Boolean(youtubeApiKey && youtubeApiKey !== 'MY_YOUTUBE_API_KEY');

let ai: GoogleGenAI | null = null;
if (hasGeminiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

export type AIProviderId = 'gemini' | 'openai' | 'anthropic';

interface AIProviderDescriptor {
  id: AIProviderId;
  name: string;
  configured: boolean;
  defaultModel: string;
  models: { id: string; label: string; tier: 'free' | 'standard' }[];
  statusMessage: string;
}

function getProviderCatalog(): AIProviderDescriptor[] {
  return [
    {
      id: 'gemini',
      name: 'Google Gemini',
      configured: Boolean(ai),
      defaultModel: 'gemini-4-hydrogen',
      models: [
        { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Fast & Capable)', tier: 'free' },
        { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (Ultra-Fast Fallback)', tier: 'free' },
      ],
      statusMessage: ai
        ? 'Connected via server GEMINI_API_KEY'
        : 'Missing GEMINI_API_KEY in server environment secrets',
    },
    {
      id: 'openai',
      name: 'OpenAI ChatGPT',
      configured: hasOpenAiKey,
      defaultModel: 'gpt-4o-mini',
      models: hasOpenAiKey
        ? [
            { id: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'standard' },
            { id: 'gpt-4o', label: 'GPT-4o', tier: 'standard' },
          ]
        : [],
      statusMessage: hasOpenAiKey
        ? 'Connected via server OPENAI_API_KEY'
        : 'Not connected — set OPENAI_API_KEY in server secrets to enable',
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      configured: hasAnthropicKey,
      defaultModel: 'claude-3-5-haiku-latest',
      models: hasAnthropicKey
        ? [
            { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', tier: 'standard' },
            { id: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet', tier: 'standard' },
          ]
        : [],
      statusMessage: hasAnthropicKey
        ? 'Connected via server ANTHROPIC_API_KEY'
        : 'Not connected — set ANTHROPIC_API_KEY in server secrets to enable',
    },
  ];
}

interface CallAIInput {
  provider?: string;
  model?: string;
  allowFallback?: boolean;
  systemInstruction?: string;
  contents: string | { role: 'user' | 'model'; content: string }[];
  responseMimeType?: 'application/json' | 'text/plain';
}

interface CallAIOutput {
  text: string;
  providerUsed: AIProviderId;
  modelUsed: string;
  fallbackFrom?: string;
}

async function invokeGemini(input: CallAIInput, chosenModel?: string): Promise<{ text: string; modelUsed: string }> {
  if (!ai) {
    throw new Error('Gemini API key is not configured on the server.');
  }

  const allowedModels = new Set(['gemini-4-hydrogen', 'gemini-3.1-flash-lite']);
  const primaryModel = chosenModel && allowedModels.has(chosenModel) ? chosenModel : 'gemini-4-hydrogen';

  const formattedContents =
    typeof input.contents === 'string'
      ? input.contents
      : input.contents.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

  const config: Record<string, any> = {};
  if (input.systemInstruction) config.systemInstruction = input.systemInstruction;
  if (input.responseMimeType === 'application/json') config.responseMimeType = 'application/json';

  let lastError: any;
  for (let attempt = 0; attempt <= 2; attempt++) {
    const modelToUse = attempt >= 2 && primaryModel === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : primaryModel;
    try {
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: formattedContents,
        config,
      });
      return { text: response.text || '', modelUsed: modelToUse };
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '');
      const isTransient =
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('overloaded') ||
        msg.includes('Resource has been exhausted');
      if (isTransient && attempt < 2) {
        const delay = 800 * Math.pow(1.8, attempt) + Math.random() * 250;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function invokeOpenAI(input: CallAIInput, chosenModel?: string): Promise<{ text: string; modelUsed: string }> {
  if (!hasOpenAiKey) {
    throw new Error('OpenAI API key is not configured on the server.');
  }
  const modelToUse = chosenModel && chosenModel.startsWith('gpt-') ? chosenModel : 'gpt-4o-mini';
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
  if (input.systemInstruction) {
    messages.push({ role: 'system', content: input.systemInstruction });
  }
  if (typeof input.contents === 'string') {
    messages.push({ role: 'user', content: input.contents });
  } else {
    for (const m of input.contents) {
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content });
    }
  }

  const body: Record<string, any> = {
    model: modelToUse,
    messages,
  };
  if (input.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI API returned ${res.status}`);
  }
  const text = data?.choices?.[0]?.message?.content || '';
  return { text, modelUsed: modelToUse };
}

async function invokeAnthropic(input: CallAIInput, chosenModel?: string): Promise<{ text: string; modelUsed: string }> {
  if (!hasAnthropicKey) {
    throw new Error('Anthropic API key is not configured on the server.');
  }
  const modelToUse = chosenModel && chosenModel.startsWith('claude-') ? chosenModel : 'claude-3-5-haiku-latest';
  const messages =
    typeof input.contents === 'string'
      ? [{ role: 'user', content: input.contents }]
      : input.contents.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelToUse,
      max_tokens: 4096,
      system: input.systemInstruction || undefined,
      messages,
    }),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Anthropic API returned ${res.status}`);
  }
  const text = data?.content?.[0]?.text || '';
  return { text, modelUsed: modelToUse };
}

async function callConfiguredAI(input: CallAIInput): Promise<CallAIOutput> {
  const catalog = getProviderCatalog();
  const configuredProviders = catalog.filter((p) => p.configured);

  if (configuredProviders.length === 0) {
    const err: any = new Error(
      'No AI provider is configured on the server. Add GEMINI_API_KEY (or OPENAI_API_KEY / ANTHROPIC_API_KEY) in Secrets.'
    );
    err.setupRequired = true;
    throw err;
  }

  const requested = (input.provider || 'gemini') as AIProviderId;
  const requestedEntry = catalog.find((p) => p.id === requested);
  const allowFallback = input.allowFallback !== false;

  // Build ordered attempt queue of genuinely configured providers only
  const queue: AIProviderId[] = [];
  if (requestedEntry?.configured) {
    queue.push(requested);
  } else if (!allowFallback) {
    throw new Error(
      `${requestedEntry?.name || requested} is not configured on the server. Select a configured provider in Settings.`
    );
  }

  if (allowFallback) {
    for (const p of configuredProviders) {
      if (!queue.includes(p.id)) queue.push(p.id);
    }
  }

  let firstFailureMsg: string | undefined;
  let lastError: any;

  for (let i = 0; i < queue.length; i++) {
    const providerId = queue[i];
    const chosenModel = i === 0 && providerId === requested ? input.model : undefined;
    try {
      if (providerId === 'gemini') {
        const out = await invokeGemini(input, chosenModel);
        return {
          text: out.text,
          providerUsed: 'gemini',
          modelUsed: out.modelUsed,
          fallbackFrom: i > 0 ? requested : undefined,
        };
      }
      if (providerId === 'openai') {
        const out = await invokeOpenAI(input, chosenModel);
        return {
          text: out.text,
          providerUsed: 'openai',
          modelUsed: out.modelUsed,
          fallbackFrom: i > 0 ? requested : undefined,
        };
      }
      if (providerId === 'anthropic') {
        const out = await invokeAnthropic(input, chosenModel);
        return {
          text: out.text,
          providerUsed: 'anthropic',
          modelUsed: out.modelUsed,
          fallbackFrom: i > 0 ? requested : undefined,
        };
      }
    } catch (err: any) {
      lastError = err;
      if (!firstFailureMsg) firstFailureMsg = formatErrorMessage(err);
      if (!allowFallback) throw err;
    }
  }

  throw lastError || new Error(firstFailureMsg || 'All configured AI providers failed.');
}

function safeParseJson<T = any>(rawText: string): T {
  const trimmed = rawText.trim();
  const stripped = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(stripped);
}

function formatErrorMessage(error: any): string {
  try {
    if (typeof error?.message === 'string') {
      if (error.message.startsWith('{') && error.message.includes('message')) {
        const parsed = JSON.parse(error.message);
        if (parsed?.error?.message) return parsed.error.message;
      }
      return error.message;
    }
  } catch {
    // ignore
  }
  return error?.message || 'AI service temporarily unavailable. Please try again shortly.';
}

function getLanguageInstruction(
  language: string = 'en',
  mode: 'chat' | 'tutor' | 'notes' | 'roadmap' | 'clarify' = 'chat'
): string {
  const lang = String(language || 'en').toLowerCase();
  const baseTechNote =
    'Keep standard engineering/scientific/programming technical terms in English in parentheses where useful for academic & exam clarity.';

  if (lang === 'auto') {
    return `LANGUAGE AUTO-DETECTION:
- Automatically detect the user's message language (English, Tamil script, Tanglish / romanized Tamil, Hindi, Telugu, Malayalam, Kannada, or mixed).
- Reply warmly and naturally in THAT SAME language (for example, if they write in Tanglish like "bro dbms normalize explain pannu", reply in clear, friendly Tanglish; if they write in Tamil, reply in Tamil; if Hindi/Telugu/Malayalam/Kannada/English, match it naturally).
- ${baseTechNote}`;
  }

  if (lang === 'ta') {
    return `RESPONSE LANGUAGE: Respond primarily in clear, natural Tamil (தமிழ்). ${baseTechNote}`;
  }
  if (lang === 'tanglish') {
    return `RESPONSE LANGUAGE: Respond in natural, friendly Tanglish (conversational Tamil written in the English alphabet, mixed naturally with accurate English technical terminology — e.g., "Ippo step-by-step-a paakalam..."). Keep explanations crystal clear and encouraging.`;
  }
  if (lang === 'hi') {
    return `RESPONSE LANGUAGE: Respond primarily in clear, natural Hindi (हिन्दी). ${baseTechNote}`;
  }
  if (lang === 'te') {
    return `RESPONSE LANGUAGE: Respond primarily in clear, natural Telugu (తెలుగు). ${baseTechNote}`;
  }
  if (lang === 'ml') {
    return `RESPONSE LANGUAGE: Respond primarily in clear, natural Malayalam (മലയാളം). ${baseTechNote}`;
  }
  if (lang === 'kn') {
    return `RESPONSE LANGUAGE: Respond primarily in clear, natural Kannada (ಕನ್ನಡ). ${baseTechNote}`;
  }

  if (mode === 'clarify') {
    return 'RESPONSE LANGUAGE: Respond in clear, simple English.';
  }
  return 'RESPONSE LANGUAGE: Respond clearly in simple, plain English, explaining concepts from first principles.';
}

// ============================================================================
// 2. SAFE WEBSITE RETRIEVAL HELPER (NO FAKE BROWSING CLAIMS)
// ============================================================================
function isPrivateOrBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    h === 'localhost' ||
    h === '::1' ||
    h.endsWith('.local') ||
    h.endsWith('.internal') ||
    h.startsWith('127.') ||
    h.startsWith('10.') ||
    h.startsWith('192.168.') ||
    h.startsWith('169.254.') ||
    h.startsWith('0.')
  ) {
    return true;
  }
  // 172.16.0.0 - 172.31.255.255
  const match172 = h.match(/^172\.(\d+)\./);
  if (match172) {
    const second = parseInt(match172[1], 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

async function fetchPublicWebpage(rawUrl: string): Promise<{
  url: string;
  status: 'fetched' | 'failed';
  title?: string;
  content?: string;
  message: string;
}> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { url: rawUrl, status: 'failed', message: 'Invalid URL format.' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { url: rawUrl, status: 'failed', message: 'Only HTTP/HTTPS URLs are supported.' };
  }

  if (isPrivateOrBlockedHost(parsed.hostname)) {
    return { url: rawUrl, status: 'failed', message: 'Private or local network URLs cannot be accessed.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);

  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'MakeYourMark-StudyReader/1.0',
        Accept: 'text/html, text/plain, application/json;q=0.9',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        url: parsed.toString(),
        status: 'failed',
        message: `Website returned HTTP ${res.status} (${res.statusText}).`,
      };
    }

    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 140) : undefined;

    const cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5500);

    if (!cleanText) {
      return {
        url: parsed.toString(),
        status: 'failed',
        message: 'Page loaded but contained no readable text (it may require client-side JavaScript or login).',
      };
    }

    return {
      url: parsed.toString(),
      status: 'fetched',
      title,
      content: cleanText,
      message: `Successfully retrieved readable content from ${parsed.hostname}.`,
    };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      url: parsed.toString(),
      status: 'failed',
      message:
        err?.name === 'AbortError'
          ? 'Timed out while trying to read that webpage.'
          : `Could not retrieve URL (${err?.message || 'network or CORS block'}).`,
    };
  }
}

// ============================================================================
// 3. LOCAL SALTED EMAIL AUTH FALLBACK (NO PLAINTEXT PASSWORDS)
// ============================================================================
const PRIMARY_DATA_DIR = path.resolve(__dirname, '.data');
const TMP_DATA_DIR = path.join('/tmp', 'makeyourmark-data');
const SESSION_SECRET =
  process.env.AUTH_SESSION_SECRET ||
  crypto.createHash('sha256').update(`makeyourmark-local-${__dirname}`).digest('hex');

interface StoredLocalUser {
  uid: string;
  name: string;
  email: string;
  salt: string;
  passwordHash: string;
  recoveryCodeHash: string;
  createdAt: string;
}

function resolveWritableDataFile(): string {
  const tmpFile = path.join(TMP_DATA_DIR, 'local-users.json');
  const primaryFile = path.join(PRIMARY_DATA_DIR, 'local-users.json');
  if (process.env.VERCEL) {
    return tmpFile;
  }
  try {
    if (!fs.existsSync(PRIMARY_DATA_DIR)) {
      fs.mkdirSync(PRIMARY_DATA_DIR, { recursive: true });
    }
    fs.accessSync(PRIMARY_DATA_DIR, fs.constants.W_OK);
    return primaryFile;
  } catch {
    return tmpFile;
  }
}

function readLocalUsers(): StoredLocalUser[] {
  try {
    const activeFile = resolveWritableDataFile();
    if (fs.existsSync(activeFile)) {
      const parsed = JSON.parse(fs.readFileSync(activeFile, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    }
    const seedFile = path.join(PRIMARY_DATA_DIR, 'local-users.json');
    if (seedFile !== activeFile && fs.existsSync(seedFile)) {
      const parsed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

function writeLocalUsers(users: StoredLocalUser[]): void {
  const activeFile = resolveWritableDataFile();
  const dir = path.dirname(activeFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(activeFile, JSON.stringify(users, null, 2), 'utf8');
}

function hashSecret(value: string, salt: string): string {
  return crypto.scryptSync(value, salt, 64).toString('hex');
}

function signSessionToken(payload: { uid: string; email: string; name: string; exp: number }): string {
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

function verifySessionToken(token: string): { uid: string; email: string; name: string } | null {
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const decoded = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!decoded.exp || Date.now() > decoded.exp) return null;
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie || '';
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  return out;
}

function setSessionCookie(res: Response, token: string) {
  res.cookie('mym_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

app.get('/api/auth/session', (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const token = cookies.mym_session;
  if (!token) {
    res.json({ authenticated: false });
    return;
  }
  const user = verifySessionToken(token);
  if (!user) {
    res.clearCookie('mym_session', { path: '/' });
    res.json({ authenticated: false });
    return;
  }
  res.json({ authenticated: true, user });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body || {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Please enter your full name (at least 2 characters).' });
    return;
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const users = readLocalUsers();
  if (users.some((u) => u.email === normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const recoveryCode = `MYM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const uid = `local_${crypto.randomBytes(8).toString('hex')}`;

  const newUser: StoredLocalUser = {
    uid,
    name: name.trim(),
    email: normalizedEmail,
    salt,
    passwordHash: hashSecret(password, salt),
    recoveryCodeHash: hashSecret(recoveryCode, salt),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeLocalUsers(users);

  const token = signSessionToken({
    uid: newUser.uid,
    email: newUser.email,
    name: newUser.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  setSessionCookie(res, token);

  res.status(201).json({
    user: { uid: newUser.uid, name: newUser.name, email: newUser.email },
    recoveryCode,
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const users = readLocalUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const attempted = hashSecret(String(password), user.salt);
  const valid = crypto.timingSafeEqual(Buffer.from(attempted, 'hex'), Buffer.from(user.passwordHash, 'hex'));
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signSessionToken({
    uid: user.uid,
    email: user.email,
    name: user.name,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  setSessionCookie(res, token);

  res.json({ user: { uid: user.uid, name: user.name, email: user.email } });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, recoveryCode, newPassword } = req.body || {};
  if (!email || !recoveryCode || !newPassword || String(newPassword).length < 6) {
    res.status(400).json({
      error: 'Email, your saved Recovery Code, and a new password (min 6 chars) are required.',
    });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const users = readLocalUsers();
  const idx = users.findIndex((u) => u.email === normalizedEmail);
  if (idx === -1) {
    res.status(404).json({ error: 'No local account found for this email address.' });
    return;
  }

  const user = users[idx];
  const attemptedRecovery = hashSecret(String(recoveryCode).trim().toUpperCase(), user.salt);
  const matches = crypto.timingSafeEqual(
    Buffer.from(attemptedRecovery, 'hex'),
    Buffer.from(user.recoveryCodeHash, 'hex')
  );
  if (!matches) {
    res.status(403).json({ error: 'Recovery code did not match.' });
    return;
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const nextRecovery = `MYM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  users[idx] = {
    ...user,
    salt: newSalt,
    passwordHash: hashSecret(String(newPassword), newSalt),
    recoveryCodeHash: hashSecret(nextRecovery, newSalt),
  };
  writeLocalUsers(users);

  res.json({ success: true, newRecoveryCode: nextRecovery });
});

app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('mym_session', { path: '/' });
  res.json({ success: true });
});

app.post('/api/auth/delete-account', (req: Request, res: Response) => {
  const cookies = parseCookies(req);
  const user = cookies.mym_session ? verifySessionToken(cookies.mym_session) : null;
  if (user) {
    const users = readLocalUsers().filter((u) => u.uid !== user.uid);
    writeLocalUsers(users);
  }
  res.clearCookie('mym_session', { path: '/' });
  res.json({ success: true });
});

// ============================================================================
// 4. HEALTH & PROVIDER STATUS API
// ============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  const providers = getProviderCatalog();
  const anyAi = providers.some((p) => p.configured);
  res.json({
    status: 'ok',
    app: 'MakeYourMark',
    hasApiKey: anyAi,
    providers,
    youtubeConfigured: hasYoutubeKey,
    liveJobsConfigured: Boolean(liveJobsApiKey),
    firebaseConfigured: fs.existsSync(path.resolve(__dirname, 'firebase-applet-config.json')),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/ai/providers', (_req: Request, res: Response) => {
  const providers = getProviderCatalog();
  res.json({
    providers,
    defaultProvider: providers.find((p) => p.configured)?.id || 'gemini',
  });
});

// ============================================================================
// 5. AI TUTOR & LEARNING ASSISTANT API (8 MODES + TAMIL/EN + NOTES/CONTEXT)
// ============================================================================
app.post('/api/ai/tutor', async (req: Request, res: Response) => {
  try {
    const {
      topic,
      subject = 'Computer Science',
      mode = 'simple-explanation',
      skillLevel = 'intermediate',
      language = 'en',
      dataSaver = false,
      responseStyle = 'balanced',
      documentContext = '',
      conversationHistory = [],
      provider,
      model,
      allowFallback = true,
    } = req.body;

    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ error: 'Topic or question is required' });
      return;
    }

    const langInstruction = getLanguageInstruction(language, 'tutor');

    const styleInstruction =
      dataSaver || responseStyle === 'concise'
        ? 'RESPONSE STYLE: Concise and high-density. Use crisp bullets and short code/math snippets.'
        : responseStyle === 'comprehensive'
        ? 'RESPONSE STYLE: Comprehensive and deep, covering intuition, formulas/code, edge cases, and real-world applications.'
        : 'RESPONSE STYLE: Balanced clarity — step-by-step explanations with concrete examples and practical tips.';

    const systemInstruction = `You are MakeYourMark AI Academic & Technical Learning Assistant supporting ALL engineering, technology, science, and non-engineering college departments (CSE, IT, AI&ML, AI&DS, Cybersecurity, ECE, EEE, E&I, VLSI & Embedded, Mechanical, Automobile, Mechatronics, Civil, Chemical, Manufacturing, Biotechnology, Biomedical, Mathematics, Business/Management, Arts & Sciences).
Subject Area: ${subject}. Difficulty Level: ${skillLevel}. Selected Learning Mode: ${mode}.
${langInstruction}
${styleInstruction}

Understanding Informal Input:
- Be warm, patient, and encouraging. Understand spelling mistakes, abbreviations, broken sentences, voice-to-text typos, and Tanglish naturally without criticizing grammar.
- Maintain continuity with earlier messages in conversationHistory so follow-up doubts build smoothly on what you already taught.

Mode Instructions:
- 'simple-explanation' / 'explain-simply': Explain from first principles with everyday analogies and minimal jargon.
- 'detailed-explanation': Deep dive covering theory, internals, diagrams in text, formulas/equations or circuits/code where applicable, and nuanced trade-offs.
- 'step-by-step': Numbered sequential walkthrough explaining what happens at each step, why it matters, and a worked example.
- 'exam-prep' / 'exam-preparation' / 'exam-notes': High-yield exam revision guide, key definitions, derivations/formulas, likely 2-mark & 16-mark university questions, and common mistakes.
- 'short-notes': Crisp bullet-point summary suitable for quick revision flashcards.
- 'quiz' / 'quiz-generation': Generate 3 multiple-choice questions (A, B, C, D) plus 1 practice problem, followed by an Answer Key explaining WHY the right option is correct AND why distractors are wrong.
- 'code-explanation' / 'code-breakdown': Line-by-line code/algorithm/simulation breakdown, time & space complexity (or hardware timing/logic), and clean practices.
- 'interview-prep' / 'interview-preparation': Explain the concept as asked in technical/core interviews, common follow-up questions, and concise verbal talking points.
- 'example' / 'practice-questions': Provide concrete worked examples (code, circuit, numerical, or case study) and 3 graded practice problems (Easy, Medium, Challenge) with hints.

Accuracy Rules:
- Do NOT fabricate citations, courses, formulas, or claim to have browsed URLs unless document text was supplied. If unsure of something, say so honestly.
- End with a brief "Practice Question" (to test understanding) and a short "Recommended Further Study" section naming verified educational platforms (MIT OpenCourseWare, NPTEL, MDN, freeCodeCamp, Khan Academy, 3Blue1Brown, IEEE/All About Circuits as relevant).
- Format cleanly in Markdown.`;

    const contents: { role: 'user' | 'model'; content: string }[] = [];
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const trimmed = conversationHistory.slice(-8);
      for (const turn of trimmed) {
        contents.push({
          role: turn.role === 'user' ? 'user' : 'model',
          content: String(turn.content || ''),
        });
      }
    }

    let userPrompt = `Subject: ${subject}\nQuestion / Topic: "${topic}"\nMode: ${mode}\nLevel: ${skillLevel}`;
    if (documentContext && typeof documentContext === 'string' && documentContext.trim()) {
      userPrompt += `\n\nAttached Study Material:\n---\n${documentContext.slice(0, 6000)}\n---`;
    }
    contents.push({ role: 'user', content: userPrompt });

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      systemInstruction,
      contents,
    });

    res.json({
      result: out.text,
      providerUsed: out.providerUsed,
      modelUsed: out.modelUsed,
      fallbackFrom: out.fallbackFrom,
    });
  } catch (error: any) {
    console.error('AI Tutor error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({
      error: formatErrorMessage(error),
      setupRequired: Boolean(error?.setupRequired),
    });
  }
});

// ============================================================================
// 6. AI CHATBOX ADVISOR API (MULTI-MODE + REAL URL FETCH + DOCUMENT ANALYSIS)
// ============================================================================
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const {
      messages,
      mode = 'career',
      language = 'en',
      dataSaver = false,
      userContext = null,
      websiteUrl = null,
      documentSnippet = null,
      provider,
      model,
      allowFallback = true,
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const trimmedHistory = dataSaver ? messages.slice(-6) : messages.slice(-14);
    const conversationHistory = trimmedHistory.map((m: { role: string; content: string }) => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      content: String(m.content || ''),
    }));

    let websiteFetchInfo: any = null;
    if (websiteUrl && typeof websiteUrl === 'string' && websiteUrl.trim()) {
      websiteFetchInfo = await fetchPublicWebpage(websiteUrl.trim());
    }

    const langInstruction = getLanguageInstruction(language, 'chat');

    let modeDescription = 'General Learning, Academic, Engineering & Career Advisor';
    if (mode === 'study') {
      modeDescription = 'Academic Study Coach: Teach college subjects across all departments (CS, ECE, EEE, Mech, Civil, Biotech, Math, Commerce), assignments, labs, and exam concepts step by step.';
    } else if (mode === 'career') {
      modeDescription = 'Career Strategist: Guide students from all departments on career paths, skills, projects, certifications, job applications, and roadmaps.';
    } else if (mode === 'resume') {
      modeDescription = 'Resume Specialist: Improve resume wording, summary, skills, projects, and ATS readability without inventing fake experience.';
    } else if (mode === 'interview') {
      modeDescription = 'Interview Coach: Conduct Q&A prep across technical/core engineering, coding, HR, aptitude, and behavioral rounds.';
    }

    let contextString = '';
    if (userContext) {
      contextString = `\nUser Profile Context:
- Department / Branch: ${userContext.department || 'Not specified'}
- Degree / Qualification & Year: ${userContext.degree || 'Student'} ${userContext.yearOfStudy ? `(${userContext.yearOfStudy})` : ''}
- Target Role: ${userContext.targetRole || userContext.targetJob || 'Not specified yet'}
- Known Skills: ${Array.isArray(userContext.knownSkills) ? userContext.knownSkills.map((s: any) => (typeof s === 'string' ? s : `${s.name} (${s.level})`)).join(', ') : 'Not listed'}
- Interests: ${Array.isArray(userContext.interests) && userContext.interests.length ? userContext.interests.join(', ') : 'Not listed'}
- Current Goal: ${userContext.careerGoals || 'Career advancement'}`;
    }

    let externalContextBlock = '';
    if (websiteFetchInfo) {
      if (websiteFetchInfo.status === 'fetched') {
        externalContextBlock += `\n\n[VERIFIED FETCHED WEBSITE CONTENT]
URL: ${websiteFetchInfo.url}
Page Title: ${websiteFetchInfo.title || 'Unknown'}
Extracted Text:
---
${websiteFetchInfo.content}
---
Ground your answer in this extracted text. Do not invent content not present on the page.`;
      } else {
        externalContextBlock += `\n\n[WEBSITE FETCH FAILED]
URL: ${websiteFetchInfo.url}
Reason: ${websiteFetchInfo.message}
CRITICAL INSTRUCTION: Tell the user honestly that the system could NOT access the content of ${websiteFetchInfo.url} (${websiteFetchInfo.message}) and invite them to paste relevant text directly. NEVER claim you opened or read that webpage.`;
      }
    }

    if (documentSnippet && typeof documentSnippet === 'string' && documentSnippet.trim()) {
      externalContextBlock += `\n\n[USER-PROVIDED DOCUMENT / TEXT EXCERPT]
---
${documentSnippet.slice(0, 6000)}
---`;
    }

    const systemInstruction = `You are MakeYourMark AI Assistant — a friendly, approachable, intelligent mentor for college students, freshers, and professionals across ALL departments and branches.
Mode: ${modeDescription}
${langInstruction}
${contextString}
${externalContextBlock}
${dataSaver ? 'DATA SAVER MODE: Be concise and under 250 words.' : 'Provide clear, step-by-step practical guidance with examples tailored to Beginner/Intermediate/Advanced clarity.'}

Conversational Intelligence Rules:
- Understand spelling mistakes, typos, missing punctuation, poor grammar, SMS shorthand (e.g., "plz", "intvw", "dbms", "os", "mech", "ece"), incomplete fragments, informal tone, and Tanglish effortlessly. NEVER correct or lecture the user on their spelling or grammar.
- Remember the earlier conversation context naturally.
- Only ask a clarifying question when the request is genuinely too ambiguous to answer usefully; otherwise answer directly right away and optionally offer next steps.
- Adapt examples to the student's actual department when known (e.g. embedded/VLSI for ECE, CAD/thermodynamics for Mechanical, DSA/web for CSE, structural/AutoCAD for Civil, lab protocols for Biotech, etc.).

Honesty & Grounding Rules:
- NEVER invent facts, fake citations, fake statistics, current job openings, hiring dates, or unverified URLs. If you do not know or cannot verify live info, say so plainly.
- NEVER claim to have opened a webpage, file, app, or video unless its actual content was provided in the prompt above.`;

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      systemInstruction,
      contents: conversationHistory,
    });

    res.json({
      reply: out.text,
      providerUsed: out.providerUsed,
      modelUsed: out.modelUsed,
      fallbackFrom: out.fallbackFrom,
      websiteFetchInfo,
    });
  } catch (error: any) {
    console.error('AI Chatbot error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({
      error: formatErrorMessage(error),
      setupRequired: Boolean(error?.setupRequired),
    });
  }
});

// ============================================================================
// 7. SKILL GAP ANALYZER API (12-POINT ANALYSIS)
// ============================================================================
app.post('/api/ai/skill-gap', async (req: Request, res: Response) => {
  try {
    const {
      careerGoal,
      targetCompany,
      education,
      department,
      yearOfStudy,
      currentSkills = [],
      skillProficiencies = {},
      projects = '',
      internships = '',
      certifications = '',
      dailyStudyHours = 2,
      targetDate = '6 months',
      preferredLearningMethods = 'Hands-on projects and interactive problem solving',
      provider,
      model,
      allowFallback = true,
    } = req.body;

    if (!careerGoal || typeof careerGoal !== 'string') {
      res.status(400).json({ error: 'Career goal is required' });
      return;
    }

    const skillsFormatted = Array.isArray(currentSkills)
      ? currentSkills.map((s) => `${s} (${skillProficiencies[s] || 'Intermediate'})`).join(', ')
      : 'None specified';

    const prompt = `Perform a comprehensive AI Goal Analysis and Skill Gap Breakdown for:
- Career Goal / Target Role: "${careerGoal}"
- Target Company / Industry: "${targetCompany || 'Industry Standard'}"
- Education: ${education || 'Undergraduate'}, Department: ${department || 'General'}, Year/Stage: ${yearOfStudy || 'Student'}
- Current Skills & Proficiency: ${skillsFormatted}
- Projects & Experience: ${projects || 'None specified'}
- Internships: ${internships || 'None specified'}
- Certifications: ${certifications || 'None specified'}
- Available Daily Study Time: ${dailyStudyHours} hours/day
- Target Achievement Timeline: ${targetDate}
- Preferred Learning Methods: ${preferredLearningMethods}

IMPORTANT:
- Do NOT invent fake job openings, fake certifications, or guaranteed hiring timelines.
- Use established real-world resources (e.g., MDN, Coursera, MIT OpenCourseWare, NPTEL, freeCodeCamp, official docs).
- Return STRICTLY valid JSON matching:
{
  "acquiredSkills": [{ "name": string, "level": "Beginner" | "Intermediate" | "Advanced", "assessment": string }],
  "requiredSkills": [{ "name": string, "category": string, "importance": string }],
  "missingSkills": [{
    "id": string,
    "name": string,
    "category": string,
    "priority": "High" | "Medium" | "Low",
    "whyImportant": string,
    "estimatedWeeks": number,
    "status": "not-started"
  }],
  "learningRoadmap": [{
    "phase": string,
    "title": string,
    "timeframe": string,
    "milestones": [string, string, string],
    "recommendedDeliverable": string
  }],
  "weeklyTimetable": [{
    "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
    "focus": string,
    "hours": number,
    "actionItems": string
  }],
  "portfolioProjects": [{
    "title": string,
    "concept": string,
    "techStack": string,
    "architectureHighlights": string,
    "resumeBullet": string
  }],
  "certificationsAndInterviews": {
    "certifications": [{ "name": string, "issuer": string, "whyValuable": string }],
    "topInterviewTopics": [string, string, string, string]
  },
  "recommendedResources": [{
    "name": string,
    "type": "Official Documentation" | "Interactive Course" | "University Lecture" | "Practice Platform",
    "url": string,
    "topics": string
  }],
  "progressSummary": {
    "matchPercentage": number,
    "totalRequired": number,
    "skillsMastered": number,
    "skillsMissing": number,
    "recommendedNextStep": string
  },
  "estimatedTimeline": {
    "totalMonths": number,
    "weeklyHours": number,
    "explanation": string
  },
  "disclaimer": "This analysis and timeline are AI-generated estimates based on general industry expectations and your specified study hours, not a hiring guarantee."
}`;

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const parsed = safeParseJson(out.text);
    res.json({
      ...parsed,
      _meta: { providerUsed: out.providerUsed, modelUsed: out.modelUsed, fallbackFrom: out.fallbackFrom },
    });
  } catch (error: any) {
    console.error('Skill Gap Analysis error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

// ============================================================================
// 8. PERSONALIZED DYNAMIC CAREER ROADMAP GENERATOR API
// ============================================================================
app.post('/api/ai/roadmap-generate', async (req: Request, res: Response) => {
  try {
    const {
      careerGoal,
      careerCategory = 'Software and IT',
      currentSkills = [],
      experienceLevel = 'Beginner / Student',
      dailyStudyHours = 2,
      targetMonths = 6,
      language = 'en',
      provider,
      model,
      allowFallback = true,
    } = req.body;

    if (!careerGoal || typeof careerGoal !== 'string') {
      res.status(400).json({ error: 'Career goal is required to generate a roadmap.' });
      return;
    }

    const langNote = getLanguageInstruction(language, 'roadmap');

    const prompt = `Design a tailored, multi-stage Career Roadmap for someone aiming to become: "${careerGoal}" (Industry Category: ${careerCategory}).
Profile:
- Current Level: ${experienceLevel}
- Current Skills: ${Array.isArray(currentSkills) && currentSkills.length > 0 ? currentSkills.join(', ') : 'Starting fresh'}
- Available Daily Study Time: ${dailyStudyHours} hours/day (~${dailyStudyHours * 7} hrs/week)
- Desired Timeline: ${targetMonths} months
${langNote}

Generate 4 to 5 logical progression stages tailored specifically to "${careerGoal}" (NOT generic placeholder boilerplate). Each stage must have 3-4 concrete skills.
For every skill include real meaning, why required, syllabus topics, legitimate courses/docs/YouTube search queries, practical exercises, and estimated hours.
Every skill MUST default to "status": "not-started". Do NOT invent fake course links — provide valid domain homepages or official docs URLs (e.g. https://react.dev, https://docs.python.org, https://www.coursera.org, https://nptel.ac.in, https://www.khanacademy.org).

Return STRICTLY valid JSON matching:
{
  "careerTitle": string,
  "careerCategory": string,
  "summary": string,
  "estimatedMonths": number,
  "disclaimer": "Estimated learning roadmap generated by AI based on your daily study budget. Actual pacing varies by prior background and practice consistency.",
  "stages": [
    {
      "id": string,
      "stageNumber": number,
      "title": string,
      "description": string,
      "skills": [
        {
          "id": string,
          "name": string,
          "meaning": string,
          "whyRequired": string,
          "whatToLearn": [string, string, string],
          "resources": [{ "name": string, "url": string, "type": "Course" | "Documentation" | "Platform" }],
          "youtubeTopics": [string, string],
          "practicalExercises": [string, string],
          "estimatedHours": number,
          "estimatedTimeLabel": string,
          "status": "not-started"
        }
      ]
    }
  ],
  "weeklySchedule": [
    { "day": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday", "hours": number, "focus": string, "activity": string }
  ],
  "monthlyPlan": [
    { "month": number, "theme": string, "goals": [string, string], "milestoneProject": string }
  ]
}`;

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const parsed = safeParseJson(out.text);
    // Guarantee every skill starts as 'not-started' (never auto-completed)
    if (Array.isArray(parsed.stages)) {
      parsed.stages = parsed.stages.map((st: any, sIdx: number) => ({
        ...st,
        id: st.id || `stage-${sIdx + 1}`,
        stageNumber: st.stageNumber || sIdx + 1,
        skills: Array.isArray(st.skills)
          ? st.skills.map((sk: any, kIdx: number) => ({
              ...sk,
              id: sk.id || `skill-${sIdx + 1}-${kIdx + 1}`,
              status: 'not-started',
            }))
          : [],
      }));
    }

    res.json({
      ...parsed,
      _meta: { providerUsed: out.providerUsed, modelUsed: out.modelUsed, fallbackFrom: out.fallbackFrom },
    });
  } catch (error: any) {
    console.error('Dynamic Roadmap generation error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

// ============================================================================
// 9. AI NOTES & STUDY MATERIAL API
// ============================================================================
app.post('/api/ai/notes', async (req: Request, res: Response) => {
  try {
    const {
      action = 'generate-from-topic',
      topic = '',
      sourceMaterial = '',
      category = 'College Subjects',
      skillName = '',
      language = 'en',
      provider,
      model,
      allowFallback = true,
    } = req.body;

    if (!topic.trim() && !sourceMaterial.trim() && !skillName.trim()) {
      res.status(400).json({ error: 'Please provide a topic, skill name, or study material.' });
      return;
    }

    const langDirective = getLanguageInstruction(language, 'notes');

    const prompt = `Create clean, high-retention structured study notes.
Action: ${action}
Category: ${category}
Topic / Course: ${topic || skillName}
${skillName ? `Linked Skill: ${skillName}` : ''}
${sourceMaterial ? `\nSource Material to Transform / Summarize:\n---\n${sourceMaterial.slice(0, 8000)}\n---` : ''}
${langDirective}

Action behaviors:
- 'generate-from-topic' / 'generate-from-skill': Create structured concept overview, core principles, practical examples, and quick-check questions.
- 'summarize-material': Distill the provided study material into clear sections, key takeaways, definitions, and formulas/patterns without inventing outside claims.
- 'revision-from-explanation': Convert into concise high-yield revision flashcards/bullets.
- 'interview-prep-notes': Organize into core concept, common interview questions & concise answers, pitfalls, and real-world trade-offs.

Return STRICTLY valid JSON:
{
  "title": string (concise descriptive note title),
  "content": string (clean Markdown formatted study note),
  "suggestedTags": [string, string, string]
}`;

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      contents: prompt,
      responseMimeType: 'application/json',
    });

    const parsed = safeParseJson(out.text);
    res.json({
      ...parsed,
      category,
      providerUsed: out.providerUsed,
      modelUsed: out.modelUsed,
    });
  } catch (error: any) {
    console.error('AI Notes error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

// ============================================================================
// 10. AI INTERVIEWER API (ALL DEPARTMENTS, FOLLOW-UPS & MULTILINGUAL CLARIFY)
// ============================================================================
app.post('/api/ai/interview', async (req: Request, res: Response) => {
  try {
    const {
      action,
      role,
      department = '',
      difficulty,
      category,
      previousQuestion,
      previousQuestions = [],
      userAnswer,
      clarificationRequest = '',
      clarificationLanguage = 'en',
      interviewHistory,
      provider,
      model,
      allowFallback = true,
    } = req.body;

    const deptContext = department ? `Student Department / Branch: ${department}.` : '';

    if (action === 'generate-question') {
      const avoidList =
        Array.isArray(previousQuestions) && previousQuestions.length > 0
          ? `\nAvoid repeating these already asked questions:\n- ${previousQuestions.slice(-8).join('\n- ')}`
          : '';

      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Generate 1 realistic interview question for a "${difficulty || 'Entry-Level'}" "${role || 'Software Developer'}".
${deptContext}
Interview Type / Category: ${category || 'Technical'}.
Ensure it matches the category and role domain faithfully (supporting Software/IT, ECE/EEE/VLSI/Embedded, Mechanical/Auto/Mechatronics, Civil/Chemical/Manufacturing, Biotech/Biomedical, Business/General):
- Technical: Domain fundamentals, core engineering principles, practical system design or lab/industry concepts.
- Coding: Algorithmic logic, problem-solving, complexity analysis, or hands-on coding/scripting problem prompt.
- HR: Motivation, culture fit, strengths/weaknesses, career goals, workplace scenarios.
- Aptitude: Quantitative, logical deduction, analytical puzzle or engineering estimation problem.
- Behavioral: STAR-method scenario (conflict, ownership, failure, teamwork).
- Mixed: Balanced real screening question combining technical + practical reasoning.
${avoidList}

Return STRICTLY valid JSON:
{
  "question": string,
  "category": string,
  "keyAspectsToLookFor": [string, string, string]
}`,
        responseMimeType: 'application/json',
      });

      res.json(safeParseJson(out.text));
      return;
    }

    if (action === 'follow-up') {
      if (!previousQuestion || !userAnswer) {
        res.status(400).json({ error: 'Previous question and candidate answer are required for a follow-up question.' });
        return;
      }
      const avoidList =
        Array.isArray(previousQuestions) && previousQuestions.length > 0
          ? `\nAvoid repeating these earlier questions:\n- ${previousQuestions.slice(-8).join('\n- ')}`
          : '';

      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `You are a realistic interviewer conducting a natural conversation for a "${difficulty || 'Entry-Level'}" "${role || 'Software Developer'}".
${deptContext}
Category: ${category || 'Technical'}
Previous Interview Question: "${previousQuestion}"
Candidate's Last Answer: "${userAnswer}"
${avoidList}

Generate 1 contextual follow-up interview question that directly probes deeper into what the candidate just said (e.g., asking about an edge case, trade-off, real-world constraint, failure mode, or an unclear claim in their response).

Return STRICTLY valid JSON:
{
  "question": string,
  "category": string,
  "keyAspectsToLookFor": [string, string, string],
  "isFollowUp": true
}`,
        responseMimeType: 'application/json',
      });

      const parsed = safeParseJson(out.text);
      res.json({ ...parsed, isFollowUp: true });
      return;
    }

    if (action === 'clarify-question') {
      const activeQuestion = previousQuestion || req.body.question;
      if (!activeQuestion) {
        res.status(400).json({ error: 'Active interview question is required to explain clarification.' });
        return;
      }
      const clarifyLang = getLanguageInstruction(clarificationLanguage || 'en', 'clarify');
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `A candidate paused the mock interview to ask for clarification on the current interview question BEFORE answering.
${clarifyLang}
Target Role: "${role || 'Software Developer'}" (${difficulty || 'Entry-Level'}) | Category: ${category || 'Technical'}
${deptContext}
Interview Question: "${activeQuestion}"
Candidate's Clarification Question / Doubt: "${clarificationRequest || 'Please explain what this question is asking and what kind of structure is expected.'}"

Rules:
- Explain clearly in the requested language what the question means, clarify any jargon/constraints, and describe how to structure a good answer.
- Understand informal questions, Tanglish, or spelling errors gracefully.
- Do NOT give a full scripted answer for them to copy word-for-word — coach and clarify instead.

Return STRICTLY valid JSON:
{
  "explanation": string,
  "hints": [string, string, string],
  "exampleStructure": string
}`,
        responseMimeType: 'application/json',
      });

      res.json(safeParseJson(out.text));
      return;
    }

    if (action === 'evaluate-answer') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Interview Question: "${previousQuestion}"
Candidate Answer: "${userAnswer}"
Target Role: "${role}" (${difficulty}) | Type: ${category || 'Technical'}
${deptContext}

Evaluate this answer thoroughly and constructively using a transparent screening rubric.
Identify:
1. What the candidate got right (correctPoints)
2. Important missing points or concepts (missingInformation)
3. Any factual mistakes or misconceptions (mistakes — empty array if none)
4. An improved sample answer tailored for this role (idealAnswerSummary)
5. Constructive feedback summary and rubric score out of 100.

Return STRICTLY valid JSON:
{
  "score": number,
  "grade": "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Work",
  "correctPoints": [string, string],
  "missingInformation": [string, string],
  "mistakes": [string],
  "strengths": [string, string],
  "areasForImprovement": [string, string],
  "constructiveFeedback": string,
  "idealAnswerSummary": string
}`,
        responseMimeType: 'application/json',
      });

      res.json(safeParseJson(out.text));
      return;
    }

    if (action === 'generate-scorecard') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Act as an Interview Committee Lead.
Evaluate this completed interview session for "${role}" (${difficulty}):
${deptContext}
${JSON.stringify(interviewHistory || [], null, 2)}

Return STRICTLY valid JSON:
{
  "overallScore": number,
  "readinessGrade": "Ready for Top Tech" | "Competitive for Mid-Market" | "Shows Potential" | "Needs Dedicated Prep",
  "executiveSummary": string,
  "topStrengths": [string, string, string],
  "areasToFocus": [string, string, string],
  "recommendedStudyActions": [string, string, string]
}`,
        responseMimeType: 'application/json',
      });

      res.json(safeParseJson(out.text));
      return;
    }

    res.status(400).json({ error: 'Invalid interview action' });
  } catch (error: any) {
    console.error('AI Interview error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

// ============================================================================
// 11. AI RESUME ANALYZER API (WITH OPTIONAL JD MATCHING & HONEST DISCLAIMER)
// ============================================================================
app.post('/api/ai/resume-analyze', async (req: Request, res: Response) => {
  try {
    const { resumeText, targetRole, jobDescription = '', provider, model, allowFallback = true } = req.body;

    if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
      res.status(400).json({ error: 'Resume text is required' });
      return;
    }

    const jdSection =
      jobDescription && typeof jobDescription === 'string' && jobDescription.trim()
        ? `\nTarget Job Description (compare resume directly against this JD):\n---\n${jobDescription.slice(0, 4000)}\n---`
        : '';

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      contents: `Analyze this resume for the target role: "${targetRole || 'Software Developer'}".
Resume Text:
---
${resumeText.slice(0, 9000)}
---
${jdSection}

Evaluate: grammar & readability, formatting structure, section completeness (Skills, Education, Projects, Experience, Contact/Links), relevance to target role, and keyword alignment.
Do NOT invent fake skills or claim this is an official corporate ATS decision.

Return STRICTLY valid JSON:
{
  "atsScore": number,
  "disclaimer": "This score is an application-generated estimate based on readability, structure, and keyword relevance—not an official corporate ATS result.",
  "summary": string,
  "grammarAndReadability": string,
  "formattingFeedback": string,
  "sectionChecks": {
    "contactInfo": boolean,
    "summary": boolean,
    "skills": boolean,
    "education": boolean,
    "projects": boolean,
    "experience": boolean
  },
  "missingSections": [string],
  "strengths": [string, string, string],
  "improvements": [string, string, string],
  "missingKeywords": [string, string, string, string],
  "jdMatchAnalysis": {
    "provided": boolean,
    "matchedKeywords": [string],
    "missingFromJd": [string],
    "relevanceNote": string
  },
  "bulletRewrites": [
    {
      "original": string,
      "improved": string,
      "reason": string
    }
  ]
}`,
      responseMimeType: 'application/json',
    });

    res.json(safeParseJson(out.text));
  } catch (error: any) {
    console.error('Resume Analyzer error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

// ============================================================================
// 12. RESUME COACH, ROADMAP TRACK, LINKEDIN & WEEKLY TASKS APIs
// ============================================================================
app.post('/api/ai/resume-coach', async (req: Request, res: Response) => {
  try {
    const { action, targetRole, inputData, provider, model, allowFallback = true } = req.body;

    if (action === 'generate-summary') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Write 2 punchy, honest resume summaries for a "${targetRole || 'Software Engineer'}".
Candidate facts provided (do NOT invent false degrees, employers, or years of experience): "${inputData || 'Dedicated student building practical software projects.'}".
Return JSON:
{
  "teachingTip": string,
  "options": [
    { "title": "Impact & Projects Focused", "text": string },
    { "title": "Skills & Growth Focused", "text": string }
  ]
}`,
        responseMimeType: 'application/json',
      });
      res.json(safeParseJson(out.text));
      return;
    }

    if (action === 'generate-bullets') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Transform these candidate notes into 3 strong resume bullets for "${targetRole || 'Software Engineer'}". Keep claims truthful to the notes (use bracket placeholders like [X%] if metrics weren't given).
Notes: "${inputData || 'Built web application features and fixed bugs'}"
Return JSON:
{
  "teachingTip": string,
  "bullets": [string, string, string]
}`,
        responseMimeType: 'application/json',
      });
      res.json(safeParseJson(out.text));
      return;
    }

    if (action === 'suggest-skills') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `List top relevant skills, tools, and keywords for "${targetRole || 'Software Engineer'}".
Return JSON:
{
  "teachingTip": string,
  "categories": [
    { "category": "Core Languages & Fundamentals", "skills": [string, string, string] },
    { "category": "Frameworks & Technologies", "skills": [string, string, string] },
    { "category": "Tools & Practices", "skills": [string, string, string] }
  ]
}`,
        responseMimeType: 'application/json',
      });
      res.json(safeParseJson(out.text));
      return;
    }

    res.status(400).json({ error: 'Invalid resume coach action' });
  } catch (error: any) {
    console.error('Resume Coach error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

app.post('/api/ai/personalized-roadmap', async (req: Request, res: Response) => {
  try {
    const { targetRole, currentSkills, learningSkills, degree, targetCompanies, provider, model, allowFallback = true } =
      req.body;

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      contents: `Create a personalized step-by-step milestone plan for targeting: "${targetRole || 'Software Engineer'}".
Context:
- Degree: ${degree || 'Student'}
- Known Skills: ${Array.isArray(currentSkills) ? currentSkills.join(', ') : 'Core'}
- Currently Learning: ${Array.isArray(learningSkills) ? learningSkills.join(', ') : 'Fundamentals'}
- Target Companies: ${Array.isArray(targetCompanies) ? targetCompanies.join(', ') : 'Tech & Product Companies'}

Return STRICTLY valid JSON:
{
  "summary": string,
  "estimatedMonths": number,
  "milestones": [
    {
      "step": number,
      "title": string,
      "timeframe": string,
      "skillsToMaster": [string, string],
      "projectToBuild": string,
      "recommendedAction": string
    }
  ]
}`,
      responseMimeType: 'application/json',
    });

    res.json(safeParseJson(out.text));
  } catch (error: any) {
    console.error('Roadmap generation error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

app.post('/api/ai/linkedin-assist', async (req: Request, res: Response) => {
  try {
    const { action, targetRole, studentDetails, provider, model, allowFallback = true } = req.body;

    if (action === 'headline') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Generate 3 compelling LinkedIn headlines (under 120 chars each) for someone targeting "${targetRole}". Details: "${studentDetails || 'Aspiring developer'}".
Return JSON: { "headlines": [string, string, string], "tip": string }`,
        responseMimeType: 'application/json',
      });
      res.json(safeParseJson(out.text));
      return;
    }

    if (action === 'about') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Write a genuine, 3-paragraph LinkedIn "About" summary for "${targetRole}". Ground in details provided: "${studentDetails}".
Return JSON: { "about": string, "keyHighlights": [string, string], "tip": string }`,
        responseMimeType: 'application/json',
      });
      res.json(safeParseJson(out.text));
      return;
    }

    if (action === 'outreach') {
      const out = await callConfiguredAI({
        provider,
        model,
        allowFallback,
        contents: `Write a polite LinkedIn connection note (under 300 chars) for connecting with an engineer or recruiter regarding "${targetRole}".
Return JSON: { "message": string, "alternativeSubject": string, "tip": string }`,
        responseMimeType: 'application/json',
      });
      res.json(safeParseJson(out.text));
      return;
    }

    res.status(400).json({ error: 'Invalid LinkedIn assist action' });
  } catch (error: any) {
    console.error('LinkedIn assist error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

app.post('/api/ai/weekly-tasks', async (req: Request, res: Response) => {
  try {
    const {
      targetRole = 'Software Development Engineer',
      currentSkills = [],
      weeklyTargetHours = 15,
      provider,
      model,
      allowFallback = true,
    } = req.body;

    const out = await callConfiguredAI({
      provider,
      model,
      allowFallback,
      contents: `Design a practical 7-day learning sprint for "${targetRole}".
Current skills: ${Array.isArray(currentSkills) ? currentSkills.join(', ') : 'Core fundamentals'}.
Weekly target: ~${weeklyTargetHours} hours total.
Generate exactly 7 tasks (Monday to Sunday).
Return STRICTLY valid JSON:
{
  "weeklyGoal": string,
  "recommendedHours": number,
  "motivationalQuote": string,
  "tasks": [
    {
      "dayOfWeek": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "title": string,
      "category": "Coding & DSA" | "Interview Prep" | "Resume & LinkedIn" | "Projects" | "Core CS & System Design",
      "priority": "High" | "Medium" | "Low",
      "estimatedMinutes": number,
      "notes": string
    }
  ]
}`,
      responseMimeType: 'application/json',
    });

    res.json(safeParseJson(out.text));
  } catch (error: any) {
    console.error('Weekly task generation error:', error);
    const status = error?.setupRequired ? 503 : 500;
    res.status(status).json({ error: formatErrorMessage(error), setupRequired: Boolean(error?.setupRequired) });
  }
});

// ============================================================================
// 13. YOUTUBE VIDEO LEARNING SEARCH API (REAL API WHEN CONFIGURED)
// ============================================================================
app.get('/api/videos/search', async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    res.status(400).json({ error: 'Search query (q) is required' });
    return;
  }

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' tutorial course')}`;

  if (!hasYoutubeKey) {
    res.json({
      liveApi: false,
      query: q,
      youtubeSearchUrl,
      videos: [],
      message: 'YOUTUBE_API_KEY is not configured on the server. Showing curated educational videos and direct YouTube search.',
    });
    return;
  }

  try {
    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=9&q=${encodeURIComponent(
      q + ' tutorial'
    )}&key=${encodeURIComponent(youtubeApiKey)}`;
    const ytRes = await fetch(apiUrl);
    const ytData: any = await ytRes.json().catch(() => ({}));
    if (!ytRes.ok) {
      throw new Error(ytData?.error?.message || `YouTube API returned ${ytRes.status}`);
    }

    const videos = Array.isArray(ytData.items)
      ? ytData.items
          .filter((item: any) => item?.id?.videoId)
          .map((item: any) => ({
            id: `yt-${item.id.videoId}`,
            youtubeId: item.id.videoId,
            title: item.snippet?.title || 'YouTube Tutorial',
            channel: item.snippet?.channelTitle || 'YouTube Creator',
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
            description: item.snippet?.description || '',
            publishedAt: item.snippet?.publishedAt || '',
            watchUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          }))
      : [];

    res.json({
      liveApi: true,
      query: q,
      youtubeSearchUrl,
      videos,
    });
  } catch (err: any) {
    console.error('YouTube search error:', err);
    res.status(502).json({
      liveApi: false,
      query: q,
      youtubeSearchUrl,
      videos: [],
      error: err?.message || 'Failed to query YouTube Data API.',
    });
  }
});

// ============================================================================
// 14. SERVER STARTUP (VITE MIDDLEWARE IN DEV / STATIC DIST IN PROD / EXPORT FOR VERCEL)
// ============================================================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MakeYourMark server running on http://0.0.0.0:${PORT} [${isProd ? 'production' : 'development'}]`);
  });
}

if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Server startup failed:', err);
    process.exit(1);
  });
}

export { app };
export default app;
