/**
 * AI 解盘配置（浏览器本地）
 *
 * 为什么放本地而不是 .env：
 *   .env 改一次要重启服务，学习者问一句「换个模型试试」就得停一次服；
 *   放 localStorage 后，模型、地址、密钥都能在设置弹窗里当场改，当场验证。
 *
 * 安全边界（写清楚，不藏）：
 *   - 密钥只存在本机 localStorage，仅在点「解盘」时作为请求体发给 /api/interpret；
 *   - 服务端不落盘、不打印、不转发给第三方；
 *   - 这是本机单人使用的前提。若要多人共用部署，必须改用服务端密钥。
 */

export type AiProviderId = 'deepseek' | 'openai' | 'custom';

export interface AiConfig {
  provider: AiProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const AI_STORAGE_KEY = 'zw.ai.v1';

export const AI_PRESETS: Record<AiProviderId, { label: string; baseUrl: string; model: string; hint: string }> = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    hint: '国内直连、便宜，中文古文语感尚可；适合日常解盘',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    hint: '需要能直连 api.openai.com；中文风格偏现代',
  },
  custom: {
    label: '自定义（OpenAI 兼容）',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:7b',
    hint: '本地 Ollama / vLLM / 任何兼容 /chat/completions 的服务都填这里',
  },
};

export const AI_PROVIDER_ORDER: AiProviderId[] = ['deepseek', 'openai', 'custom'];

export function defaultAiConfig(): AiConfig {
  const p = AI_PRESETS.deepseek;
  return { provider: 'deepseek', baseUrl: p.baseUrl, model: p.model, apiKey: '' };
}

export function loadAiConfig(): AiConfig {
  if (typeof window === 'undefined') return defaultAiConfig();
  try {
    const raw = window.localStorage.getItem(AI_STORAGE_KEY);
    if (!raw) return defaultAiConfig();
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    const provider: AiProviderId =
      parsed.provider === 'openai' || parsed.provider === 'custom' ? parsed.provider : 'deepseek';
    const base = AI_PRESETS[provider];
    return {
      provider,
      baseUrl: typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim() ? parsed.baseUrl.trim() : base.baseUrl,
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : base.model,
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
    };
  } catch {
    return defaultAiConfig();
  }
}

export function saveAiConfig(cfg: AiConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    /* 浏览器禁用存储时静默降级：本次会话仍可用，只是下次要重填 */
  }
}

export function clearAiConfig(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(AI_STORAGE_KEY);
  } catch {
    /* 同上 */
  }
}

/** 有 key 才算配好：地址与模型都有预设兜底，只有 key 是必须人填的 */
export function isAiConfigured(cfg: AiConfig): boolean {
  return !!cfg.apiKey.trim();
}
