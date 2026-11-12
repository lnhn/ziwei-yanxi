/**
 * POST /api/interpret —— 解盘接口（OpenAI 兼容协议）
 *
 * 开源版原本不含这个接口（页面会提示“开源版不含 AI 解读接口”）。
 * 这里补一个最小实现：拿前端组装好的提示词去调模型，返回纯文本。
 * 没配 Key 时不报 500，而是回一句人话，让排盘与提示词功能仍可独立使用。
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ProviderConfig {
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

function resolveProvider(): ProviderConfig {
  const provider = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();
  if (provider === 'openai') {
    return {
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    };
  }
  if (provider === 'deepseek') {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    };
  }
  // 其余一律按「OpenAI 兼容的自建/第三方服务」处理
  return {
    apiKey: process.env.AI_API_KEY || process.env.MIMO_API_KEY,
    baseUrl: process.env.AI_BASE_URL || process.env.MIMO_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.AI_MODEL || process.env.MIMO_MODEL || 'gpt-4o-mini',
  };
}

export async function POST(req: Request) {
  let prompt = '';
  let probe = false;
  let cfg = resolveProvider();
  try {
    const body = (await req.json()) as {
      prompt?: unknown;
      probe?: unknown;
      config?: { apiKey?: unknown; baseUrl?: unknown; model?: unknown };
    };
    prompt = typeof body.prompt === 'string' ? body.prompt : '';
    probe = body.probe === true;

    // 前端设置弹窗带来的配置优先：让「换个模型当场试」不用重启服务。
    // 只覆盖实际传了的字段，缺的回落到环境变量。
    const c = body.config;
    if (c && typeof c === 'object') {
      const apiKey = typeof c.apiKey === 'string' ? c.apiKey.trim() : '';
      const baseUrl = typeof c.baseUrl === 'string' ? c.baseUrl.trim() : '';
      const model = typeof c.model === 'string' ? c.model.trim() : '';
      if (apiKey || baseUrl || model) {
        cfg = {
          apiKey: apiKey || cfg.apiKey,
          baseUrl: baseUrl || cfg.baseUrl,
          model: model || cfg.model,
        };
      }
    }
  } catch {
    return Response.json({ error: '请求体不是合法 JSON' }, { status: 400 });
  }

  if (!probe && !prompt.trim()) {
    return Response.json({ error: '提示词为空' }, { status: 400 });
  }

  const configured = !!cfg.apiKey && cfg.apiKey !== 'your-deepseek-api-key';
  if (!configured) {
    return Response.json({
      error: '尚未配置模型密钥',
      hint: '打开侧栏「设置」→「解盘模型」，填 API Key 后点保存即可，无需重启服务。当前也可用「复制提示词」到任意 AI 工具。',
    }, { status: 400 });
  }

  try {
    const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: probe
          ? [{ role: 'user', content: '只回复两个字：连通' }]
          : [
            { role: 'system', content: '你是严谨的紫微斗数助教，论断必须给出盘面依据，不做医疗诊断，不预测具体事件。' },
            { role: 'user', content: prompt },
          ],
        temperature: probe ? 0 : 0.4,
        max_tokens: probe ? 16 : 2000,
      }),
      signal: AbortSignal.timeout(probe ? 30000 : 120000),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `模型返回 ${res.status}`, detail: text.slice(0, 400) }, { status: 502 });
    }

    // 探测模式只关心「通不通」，把返回文本截短回给设置面板
    if (probe) {
      const raw = await res.text();
      return Response.json({ ok: true, model: cfg.model, sample: raw.slice(0, 200) });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
      return Response.json({ error: '模型返回为空' }, { status: 502 });
    }
    return Response.json({ content, model: cfg.model });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: '调用模型失败', detail: msg.slice(0, 300) }, { status: 502 });
  }
}
