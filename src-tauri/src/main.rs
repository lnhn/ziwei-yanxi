// 桌面入口：先声明 DPI 感知，再调用 lib 里的 run()
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// 让进程以 per-monitor v2 的 DPI 感知方式启动。
/// mingw 目标下没有嵌入带 dpiAware 的清单，缺了这一步 Windows 会把窗口当 DPI-unaware 位图拉伸，
/// 结果就是窗口被摆到屏外、窗口内布局按 1920 逻辑像素铺在 3079 物理像素上。
#[cfg(windows)]
fn enable_per_monitor_dpi() {
    #[link(name = "user32")]
    unsafe extern "system" {
        fn SetProcessDpiAwarenessContext(value: isize) -> i32;
    }
    // DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 == -4
    unsafe {
        let _ = SetProcessDpiAwarenessContext(-4);
    }
}

#[cfg(not(windows))]
fn enable_per_monitor_dpi() {}

fn main() {
    enable_per_monitor_dpi();
    ziwei_yanxi_lib::run()
}
