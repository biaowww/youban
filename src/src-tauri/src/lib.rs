// ============================================================
// 游伴 YouBan · Tauri 后端
// 提供与 Electron 主进程等价的两个数据命令：
//   get_game_list        → 列出 data/games/*.json 概要
//   get_game_data(id)    → 返回某游戏的完整 JSON
// 数据来源不变：src/data/games/*.json（打包后作为 Tauri 资源 -> resource/games）
// ============================================================
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// 解析游戏数据目录：打包后用资源目录，开发态回退到相对路径。
fn games_dir(app: &tauri::AppHandle) -> PathBuf {
    // 1) 打包后：<resource_dir>/games
    if let Ok(res) = app.path().resource_dir() {
        let p = res.join("games");
        if p.exists() {
            return p;
        }
    }
    // 2) 开发态候选（`tauri dev` 的 cwd = src-tauri/）
    for c in [
        PathBuf::from("../data/games"),
        PathBuf::from("../../src/data/games"),
        PathBuf::from("data/games"),
    ] {
        if c.exists() {
            return c;
        }
    }
    PathBuf::from("../data/games")
}

/// 列出全部游戏概要（自动发现，无需注册）。
#[tauri::command]
fn get_game_list(app: tauri::AppHandle) -> Result<Vec<Value>, String> {
    let dir = games_dir(&app);
    let mut out = Vec::new();
    let entries =
        fs::read_dir(&dir).map_err(|e| format!("读取游戏目录失败 {:?}: {}", dir, e))?;
    for entry in entries {
        let path = entry.map_err(|e| e.to_string())?.path();
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let data: Value = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
            out.push(json!({
                "id": data.get("id"),
                "name": data.get("name"),
                "year": data.get("year"),
                "posterUrl": data.get("posterUrl"),
            }));
        }
    }
    Ok(out)
}

/// 返回某游戏的完整 JSON 数据。
#[tauri::command]
fn get_game_data(app: tauri::AppHandle, id: String) -> Result<Value, String> {
    let dir = games_dir(&app);
    let path = dir.join(format!("{}.json", id));
    let raw =
        fs::read_to_string(&path).map_err(|e| format!("无法读取游戏数据 {:?}: {}", path, e))?;
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_game_list, get_game_data])
        .run(tauri::generate_context!())
        .expect("启动 Tauri 应用失败");
}
