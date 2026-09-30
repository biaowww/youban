// ============================================================
// 游伴 YouBan · Tauri 后端（最小外壳）
// 前端是自包含静态目录 src/web-dist/（由 scripts/stage-web.js 暂存），
// 游戏数据走内嵌的 mock-data.js，攻略簿直连线上 HTTPS API，
// 因此这里不需要任何自定义命令，只负责起窗口。
// 将来要接本地能力（存档读取、平台授权回调等）再在此加 #[tauri::command]。
// （旧脚手架里的 get_game_list / get_game_data 命令见 git 历史 13672c2。）
// ============================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
