/**
 * AI 调用入口 —— 网页版与桌面版共用
 *
 * 为什么要有这一层：
 *   网页版跑在 Next 服务上，走后端 /api/interpret（密钥不进浏览器、也不受 CORS 限制）；
 *   桌面版（Tauri）没有 Node 服务，静态产物里也不存在那个路由，
 *   所以改走 Rust 侧的 ai_chat 命令，由 reqwest 直连模型服务。
 *
 * 判断方式：Tauri 2 会在 window 上挂 __TAURI_INTERNALS__。
 * 只在这里判断一次，页面与组件调 chat() 即可，不必各自认环境。
 */

export type ChatPayload = {
  system?: string;
  prompt: string;
  /** 前端设置面板里覆盖 env 的三项 */
  config?: { apiKey?: string; baseUrl?: string; model?: string };
  maxTokens?: number;
  /** 设置面板的「测试连接」用：短超时 + 极少 token */
  probe?: boolean;
};

export type ChatResult = { ok: boolean; text: string; error?: string };

type TauriWindow = Window & {
  __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
};

function tauriInvoke(): TauriWindow['__TAURI_INTERNALS__'] | null {
  if (typeof window === 'undefined') return null;
  return (window as TauriWindow).__TAURI_INTERNALS__ ?? null;
}

/** 是否在桌面壳里跑（决定要不要走 Rust 命令） */
export function isDesktop(): boolean {
  return tauriInvoke() !== null;
}

export async function chat(payload: ChatPayload): Promise<ChatResult> {
  const t = tauriInvoke();
  if (t) {
    try {
      const raw = await t.invoke('ai_chat', {
        payload: {
          system: payload.system ?? null,
          prompt: payload.prompt,
          apiKey: payload.config?.apiKey ?? null,
          baseUrl: payload.config?.baseUrl ?? null,
          model: payload.config?.model ?? null,
          maxTokens: payload.maxTokens ?? null,
          probe: payload.probe ?? false,
        },
      });
      // Rust 侧统一返回 { ok, text, error }
      const r = raw as ChatResult;
      return { ok: r?.ok !== false && !!r?.text, text: r?.text ?? '', error: r?.error };
    } catch (e) {
      return { ok: false, text: '', error: `桌面壳调用失败：${String(e)}` };
    }
  }

  // 网页版：仍走后端路由
  try {
    const res = await fetch('/api/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const t2 = await res.text().catch(() => '');
      return { ok: false, text: '', error: t2 || `HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, text: (data?.text ?? data?.content ?? '') as string };
  } catch (e) {
    return { ok: false, text: '', error: String(e) };
  }
}
