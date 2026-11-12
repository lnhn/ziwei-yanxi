// Rust 侧：桌面壳 + AI 代理
//
// 为什么 AI 要放在 Rust：
//   静态导出的产物里没有 Node 服务，/api/interpret 这个路由不存在；
//   而浏览器直连模型服务常常被 CORS 拦住。这里用 reqwest 代发请求，
//   密钥只从本机 localStorage 读出来传进来，不落盘、不上传。

// Windows 上 release 版不要弹黑色控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatPayload {
    system: Option<String>,
    prompt: String,
    api_key: Option<String>,
    base_url: Option<String>,
    model: Option<String>,
    max_tokens: Option<u32>,
    probe: Option<bool>,
}

#[derive(Debug, Serialize)]
struct ChatReply {
    ok: bool,
    text: String,
    error: Option<String>,
}

fn env_or(key: &str, fallback: &str) -> String {
    match std::env::var(key) {
        Ok(v) if !v.trim().is_empty() => v,
        _ => fallback.to_string(),
    }
}

/// 把 `https://api.deepseek.com` 或 `https://api.deepseek.com/v1/chat/completions`
/// 统一成完整端点，免得前端填什么就打到什么。
fn chat_endpoint(base: &str) -> String {
    let b = base.trim().trim_end_matches('/');
    if b.ends_with("/chat/completions") {
        b.to_string()
    } else if b.ends_with("/v1") {
        format!("{b}/chat/completions")
    } else {
        format!("{b}/v1/chat/completions")
    }
}

#[tauri::command]
async fn ai_chat(payload: ChatPayload) -> ChatReply {
    let api_key = payload
        .api_key
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| env_or("DEEPSEEK_API_KEY", ""));

    if api_key.trim().is_empty() || api_key.contains("your-") {
        return ChatReply {
            ok: false,
            text: String::new(),
            error: Some("没有可用的 API Key：先在设置里填好模型密钥".into()),
        };
    }

    let base = payload
        .base_url
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| env_or("AI_BASE_URL", "https://api.deepseek.com"));
    let model = payload
        .model
        .clone()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| env_or("AI_MODEL", "deepseek-chat"));

    let max_tokens = if payload.probe.unwrap_or(false) {
        16
    } else {
        payload.max_tokens.unwrap_or(2048)
    };

    let mut messages = Vec::new();
    if let Some(sys) = payload.system.clone().filter(|s| !s.is_empty()) {
        messages.push(serde_json::json!({ "role": "system", "content": sys }));
    }
    messages.push(serde_json::json!({ "role": "user", "content": payload.prompt }));

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.6,
        "stream": false,
    });

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(if payload.probe.unwrap_or(false) { 30 } else { 180 }))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return ChatReply { ok: false, text: String::new(), error: Some(format!("创建 HTTP 客户端失败：{e}")) }
        }
    };

    let resp = client
        .post(chat_endpoint(&base))
        .bearer_auth(api_key.trim())
        .json(&body)
        .send()
        .await;

    let resp = match resp {
        Ok(r) => r,
        Err(e) => {
            return ChatReply { ok: false, text: String::new(), error: Some(format!("请求模型失败：{e}")) }
        }
    };

    let status = resp.status();
    let raw = resp.text().await.unwrap_or_default();

    if !status.is_success() {
        let detail = serde_json::from_str::<serde_json::Value>(&raw)
            .ok()
            .and_then(|v| {
                v.get("error")
                    .and_then(|e| e.get("message").or(Some(e)))
                    .map(|m| m.to_string())
            })
            .unwrap_or_else(|| raw.chars().take(300).collect());
        return ChatReply {
            ok: false,
            text: String::new(),
            error: Some(format!("模型返回 {status}：{detail}")),
        };
    }

    let text = serde_json::from_str::<serde_json::Value>(&raw)
        .ok()
        .and_then(|v| {
            v.get("choices")
                .and_then(|c| c.get(0))
                .and_then(|c| c.get("message"))
                .and_then(|m| m.get("content"))
                .and_then(|t| t.as_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_default();

    if text.trim().is_empty() {
        ChatReply { ok: false, text: String::new(), error: Some("模型返回了空内容".into()) }
    } else {
        ChatReply { ok: true, text, error: None }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![ai_chat])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
