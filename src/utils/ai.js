import { tracer, provider as traceProvider } from './tracing.js';

const STORAGE_KEY = 'ai_settings';

export const PROVIDERS = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'OpenRouter API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://openrouter.ai/keys',
    models: [
      'openai/gpt-oss-120b:free',
      'openai/gpt-oss-20b:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-nano-9b-v2:free',
      'meta-llama/llama-3.3-70b-instruct',
      'deepseek/deepseek-chat',
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Google AI Studio API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      'gemini-2.5-flash',
      'gemini-3.5-flash',
      'gemini-2.5-pro',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash-lite',
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Groq API Key',
    apiKeyHelp: 'Get your free key at',
    apiKeyHelpUrl: 'https://console.groq.com/keys',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
    ],
  },
  {
    id: 'together',
    label: 'Together AI',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Together AI API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://api.together.xyz/settings/api-keys',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'deepseek-ai/DeepSeek-V3.1',
      'Qwen/Qwen2.5-72B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      'mistralai/Mistral-Small-24B-Instruct-2501',
    ],
  },
  {
    id: 'deepinfra',
    label: 'DeepInfra',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'DeepInfra API Key',
    apiKeyHelp: 'Get your key at',
    apiKeyHelpUrl: 'https://deepinfra.com/dash/api_keys',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'deepseek-ai/DeepSeek-V3.1',
      'Qwen/Qwen2.5-72B-Instruct',
      'meta-llama/Meta-Llama-3.1-8B-Instruct',
      'zai-org/GLM-5.2',
    ],
  },
  {
    id: 'cohere',
    label: 'Cohere',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'Cohere API Key',
    apiKeyHelp: 'Get your free trial key at',
    apiKeyHelpUrl: 'https://dashboard.cohere.com/api-keys',
    models: [
      'command-a-03-2025',
      'command-a-plus-05-2026',
      'command-r-plus-08-2024',
      'command-r-08-2024',
      'command-r7b-12-2024',
    ],
  },
  {
    id: 'huggingface',
    label: 'HuggingFace',
    requiresApiKey: true,
    requiresBaseUrl: false,
    apiKeyLabel: 'HuggingFace Token',
    apiKeyHelp: 'Create a token with Inference Providers access at',
    apiKeyHelpUrl: 'https://huggingface.co/settings/tokens',
    models: [
      'meta-llama/Llama-3.3-70B-Instruct',
      'deepseek-ai/DeepSeek-V3.1',
      'Qwen/Qwen2.5-72B-Instruct',
      'mistralai/Mistral-Small-24B-Instruct-2501',
      'meta-llama/Llama-3.1-8B-Instruct',
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    requiresApiKey: false,
    requiresBaseUrl: true,
    apiKeyLabel: null,
    apiKeyHelp: 'Ollama runs locally — no key needed. Install at',
    apiKeyHelpUrl: 'https://ollama.com',
    defaultBaseUrl: 'http://localhost:11434',
    models: [
      'llama3.3',
      'llama3.2',
      'qwen3',
      'qwen2.5',
      'gemma3',
      'phi4',
      'mistral',
      'deepseek-r1',
    ],
  },
];

const DEFAULTS = {
  provider: 'openrouter',
  model: 'openai/gpt-oss-120b:free',
  apiKey: '',
  ollamaBaseUrl: 'http://localhost:11434',
};

const OPENAI_COMPAT_URLS = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  together: 'https://api.together.xyz/v1/chat/completions',
  deepinfra: 'https://api.deepinfra.com/v1/openai/chat/completions',
  huggingface: 'https://router.huggingface.co/v1/chat/completions',
};

const buildPrompt = (metadata) => {
  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;

  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'Unknown chapter history';

  const anchorContext = anchors?.start && anchors?.end
    ? `\n- The current chapter begins with: "${anchors.start}..."\n- It ends near: "${anchors.end}..."`
    : '';

  return `You are an expert literary assistant. The user is reading the book "${title}" by ${author}.

User current position:
- Progress: ${(parseFloat(progress) * 100).toFixed(1)}% through the book
- Chapters already finished: ${chapterList}
- Just finished reading: ${chapterName || 'Unknown'}${anchorContext}

Task:
Provide a concise summary of the plot events that led up to this exact point in the book.
Do not include spoilers for events that happen after this chapter.

Structure your response as markdown with bullets, a short key characters section, and a one-sentence current situation description.
Keep it under 400 words.`;
};

// If a stored model id is no longer offered by its provider (e.g. it was
// retired since the user last saved), fall back to the provider's first
// model so AI calls don't 404. Ollama is skipped — its list is only a
// suggestion and users may run any locally-pulled model.
const sanitizeModel = (settings) => {
  if (settings.provider === 'ollama') return settings;
  const config = PROVIDERS.find((p) => p.id === settings.provider);
  const models = config?.models ?? [];
  if (models.length && !models.includes(settings.model)) {
    return { ...settings, model: models[0] };
  }
  return settings;
};

export const getAISettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return sanitizeModel({ ...DEFAULTS, ...JSON.parse(stored) });
    }
  } catch {
    // ignore parse errors
  }

  const legacyKey = localStorage.getItem('gemini_api_key');
  if (legacyKey) {
    return {
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      apiKey: legacyKey,
    };
  }

  return DEFAULTS;
};

export const saveAISettings = (settings) => {
  const merged = { ...DEFAULTS, ...settings };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
};

const openAICompatSummary = async (metadata, apiKey, model, providerKey) => {
  const prompt = buildPrompt(metadata);

  const response = await fetch(OPENAI_COMPAT_URLS[providerKey], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful and concise literary analysis assistant.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || `Failed to generate summary with ${providerKey}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error(`${providerKey} returned an unexpected response structure.`);
  }

  return text;
};

const openRouterSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'openrouter');
};

const geminiSummary = async (metadata, apiKey, model) => {
  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;
  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'Unknown chapter history';

  const anchorContext = anchors?.start && anchors?.end
    ? `\n  - **The current chapter begins with:** "${anchors.start}..."\n  - **The current chapter ends near:** "${anchors.end}..."`
    : '';

  const prompt = `You are an expert literary assistant. The user is reading the book "${title}" by ${author}.

**User's Current Position:**
- **Progress:** ${(parseFloat(progress) * 100).toFixed(1)}% through the book
- **Chapters already finished:** ${chapterList}
- **Just finished reading:** ${chapterName || 'Unknown'}${anchorContext}

Provide a detailed but concise summary of the specific plot events that occurred leading up to this point in the book. Avoid spoilers for what happens after this chapter.
Structure the answer as markdown with bullet points, a short key characters section, and a one-sentence current situation summary.`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(`${endpoint}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || 'Failed to generate summary with Gemini');
  }

  const data = await response.json();
  const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error('Gemini returned an unexpected response structure.');
  }

  return responseText;
};

const groqSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'groq');
};

const togetherSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'together');
};

const deepinfraSummary = async (metadata, apiKey, model) => {
  return openAICompatSummary(metadata, apiKey, model, 'deepinfra');
};

const cohereSummary = async (metadata, apiKey, model) => {
  const prompt = buildPrompt(metadata);

  const response = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful and concise literary analysis assistant.' },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Failed to generate summary with Cohere');
  }

  const payload = await response.json();
  const text = payload?.message?.content?.[0]?.text;

  if (!text) {
    throw new Error('Cohere returned an unexpected response structure.');
  }

  return text;
};

const ollamaSummary = async (metadata, model, baseUrl) => {
  const prompt = buildPrompt(metadata);
  const cleanBase = baseUrl.replace(/\/$/, '');
  const url = `${cleanBase}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful and concise literary analysis assistant.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Failed to connect to Ollama. Is it running?');
  }

  const payload = await response.json();
  const text = payload?.message?.content;

  if (!text) {
    throw new Error('Ollama returned an unexpected response structure.');
  }

  return text;
};

/**
 * Returns true when the currently selected provider has everything it needs
 * to make a request (an API key, unless the provider is keyless like Ollama).
 */
export const hasAIConfigured = () => {
  const { provider, apiKey } = getAISettings();
  const providerConfig = PROVIDERS.find((p) => p.id === provider);
  if (!providerConfig) return false;
  return providerConfig.requiresApiKey ? !!apiKey : true;
};

/**
 * Sends a single text prompt to the configured provider and returns the reply.
 * This is the shared entry point for every free-form AI feature (explain,
 * follow-up, recall, orientation, knowledge-base answers).
 */
export const generateText = async (prompt) => {
  const { provider, apiKey, model, ollamaBaseUrl } = getAISettings();
  const providerConfig = PROVIDERS.find((p) => p.id === provider);
  if (providerConfig?.requiresApiKey && !apiKey) {
    throw new Error('AI API Key is missing. Please configure it in Settings.');
  }

  if (provider === 'gemini') {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error?.message || 'Failed to call Gemini');
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini returned an unexpected response.');
    return text;
  }

  if (provider === 'ollama') {
    const cleanBase = (ollamaBaseUrl || 'http://localhost:11434').replace(/\/$/, '');
    const response = await fetch(`${cleanBase}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: false, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!response.ok) throw new Error('Failed to connect to Ollama. Is it running?');
    const payload = await response.json();
    const text = payload?.message?.content;
    if (!text) throw new Error('Ollama returned an unexpected response.');
    return text;
  }

  if (provider === 'cohere') {
    const response = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Failed to call Cohere');
    }
    const payload = await response.json();
    const text = payload?.message?.content?.[0]?.text;
    if (!text) throw new Error('Cohere returned an unexpected response.');
    return text;
  }

  // OpenAI-compat: openrouter, groq, together, deepinfra, huggingface
  const url = OPENAI_COMPAT_URLS[provider];
  if (!url) throw new Error(`Unsupported provider: ${provider}`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error?.message || `Failed to call ${provider}`);
  }
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${provider} returned an unexpected response.`);
  return text;
};

export const generateExplain = async (ctx) => {
  const { selectedText, bookTitle, bookAuthor, chapterName, surroundingText } = ctx;
  const contextBlock = surroundingText
    ? `\n\nThe passage around the selection (for scene context):\n"...${surroundingText}..."`
    : '';
  const prompt = `You are an insightful literary companion inside the Atheneum reading app.

The reader is reading "${bookTitle}" by ${bookAuthor}, currently in "${chapterName || 'an early chapter'}".

They have selected the following text:
"${selectedText}"
${contextBlock}

Your task: Explain this selection in a way that is deeply useful to THIS reader at THIS moment.

RULES:
- Explain what this means in the context of the scene, characters, themes, and tone of the book.
- If it's a word or phrase, explain its meaning AND its narrative significance here.
- If it's a concept, metaphor, or reference (literary, historical, cultural), explain what it means and why the author used it.
- Write in clear, warm, engaging prose. Maximum 200 words. No bullet points.
- Do NOT spoil events that happen after the current chapter.`;

  return generateText(prompt);
};

export const generateFollowUp = async (ctx) => {
  const { selectedText, explanation, question, bookTitle, bookAuthor, chapterName } = ctx;
  const prompt = `You are an insightful literary companion inside the Atheneum reading app.

The reader is reading "${bookTitle}" by ${bookAuthor}, in "${chapterName || 'an early chapter'}".

The selected passage: "${selectedText}"

You already explained: "${explanation}"

The reader now asks: "${question}"

Answer their follow-up question concisely and helpfully in 100–150 words. Warm tone, plain prose. No bullet points. Do not spoil future events.`;

  return generateText(prompt);
};

/**
 * Warm, narrative "where you left off" recap for a reader returning to a book.
 * @param {object} metadata - { title, author, chapterName, progress, previousChapters, anchors }
 * @param {'quick'|'standard'|'detailed'} length
 */
export const generateRecall = async (metadata, length = 'standard') => {
  const { title, author, chapterName, progress, previousChapters, anchors } = metadata;
  const chapterList = previousChapters && previousChapters.length > 0
    ? previousChapters.join(', ')
    : 'the beginning';
  const anchorContext = anchors?.start
    ? `The last section they were reading started with: "${anchors.start}..."`
    : '';
  const lengthInstructions = {
    quick: 'Respond in exactly 2 warm, engaging sentences. Be concise but evocative.',
    standard: 'Respond in 150–200 words of flowing, warm narrative prose.',
    detailed: 'Respond in up to 400 words of rich, warm narrative prose.',
  };

  const prompt = `You are a warm, enthusiastic reading companion for the Atheneum app.

The user is returning to read "${title}" by ${author} after being away for a few days.
They are ${(parseFloat(progress) * 100).toFixed(0)}% through the book.
Chapters they have already read: ${chapterList}.
They were last reading chapter: "${chapterName || 'an early section'}".
${anchorContext}

Your task: Write a friendly, narrative recap to help them remember where they left off — like a knowledgeable friend catching them up before they dive back in.

CRITICAL RULES:
- Write in warm, flowing PROSE. DO NOT use bullet points, headers, or lists.
- DO NOT spoil anything that happens AFTER "${chapterName}". Only recap what has already happened.
- DO NOT invent plot points. If you are unsure, be vague and focus on tone and character feelings.
- ${lengthInstructions[length] || lengthInstructions.standard}
- End with a single short sentence of encouragement to jump back in.`;

  return generateText(prompt);
};

/**
 * Enticing orientation card for a book the user is opening for the first time.
 * @param {object} metadata - { title, author }
 */
export const generateOrientation = async (metadata) => {
  const { title, author } = metadata;
  const prompt = `You are a warm, enthusiastic reading companion for the Atheneum app.

The user is about to start reading "${title}" by ${author} for the very first time.

Your task: Write a short, enticing orientation to set the scene — like a knowledgeable friend giving a warm introduction before they begin.

CRITICAL RULES:
- Write in warm, flowing PROSE. DO NOT use bullet points, headers, or lists.
- DO NOT reveal major plot twists, endings, or significant spoilers.
- Cover: the genre/tone, the world or setting, and the emotional experience readers can expect.
- Keep it to exactly 100–150 words.
- End with a single short sentence of excitement to encourage them to begin.`;

  return generateText(prompt);
};

export const generateSummary = async (metadata) => {
  const { provider, apiKey, model, ollamaBaseUrl } = getAISettings();

  const providerConfig = PROVIDERS.find((p) => p.id === provider);
  if (providerConfig?.requiresApiKey && !apiKey) {
    throw new Error('AI API Key is missing. Please configure it in Settings.');
  }

  return tracer.startActiveSpan('ai.generateSummary', async (span) => {
    span.setAttribute('llm.provider', provider);
    span.setAttribute('llm.model_name', model);
    span.setAttribute('input.value', JSON.stringify(metadata));
    span.setAttribute('input.mime_type', 'text/plain');

    try {
      let result;
      if (provider === 'openrouter') {
        result = await openRouterSummary(metadata, apiKey, model);
      } else if (provider === 'groq') {
        result = await groqSummary(metadata, apiKey, model);
      } else if (provider === 'together') {
        result = await togetherSummary(metadata, apiKey, model);
      } else if (provider === 'deepinfra') {
        result = await deepinfraSummary(metadata, apiKey, model);
      } else if (provider === 'gemini') {
        result = await geminiSummary(metadata, apiKey, model);
      } else if (provider === 'cohere') {
        result = await cohereSummary(metadata, apiKey, model);
      } else if (provider === 'huggingface') {
        result = await openAICompatSummary(metadata, apiKey, model, 'huggingface');
      } else if (provider === 'ollama') {
        const baseUrl = ollamaBaseUrl || 'http://localhost:11434';
        result = await ollamaSummary(metadata, model, baseUrl);
      } else {
        throw new Error(`Unsupported AI provider: ${provider}`);
      }

      span.setAttribute('output.value', result);
      span.setStatus({ code: 1 });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      throw error;
    } finally {
      span.end();
      if (traceProvider && typeof traceProvider.forceFlush === 'function') {
        setTimeout(() => traceProvider.forceFlush().catch(console.error), 0);
      }
    }
  });
};
