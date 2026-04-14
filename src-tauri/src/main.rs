#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

const BACKEND_ADDR: &str = "127.0.0.1:3001";

struct BackendState(Mutex<Option<Child>>);

fn is_backend_healthy() -> bool {
  let addr: SocketAddr = match BACKEND_ADDR.parse() {
    Ok(addr) => addr,
    Err(_) => return false,
  };

  let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(300)) {
    Ok(stream) => stream,
    Err(_) => return false,
  };

  let _ = stream.set_read_timeout(Some(Duration::from_millis(300)));
  let _ = stream.set_write_timeout(Some(Duration::from_millis(300)));

  if stream
    .write_all(b"GET /health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
    .is_err()
  {
    return false;
  }

  let mut response = String::new();
  if stream.read_to_string(&mut response).is_err() {
    return false;
  }

  response.contains("200")
}

fn wait_backend_ready(timeout: Duration) -> bool {
  let start = Instant::now();
  while start.elapsed() <= timeout {
    if is_backend_healthy() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(200));
  }
  false
}

fn spawn_backend(app: &tauri::AppHandle) -> Result<Child, String> {
  let resource_dir = app
    .path_resolver()
    .resource_dir()
    .ok_or_else(|| "无法定位资源目录".to_string())?;

  let node_binary_name = if cfg!(target_os = "windows") {
    "node.exe"
  } else {
    "node"
  };

  let node_path = resource_dir.join("runtime").join(node_binary_name);
  let server_entry = resource_dir.join("server").join("dist").join("index.js");
  let server_dir = resource_dir.join("server");

  if !node_path.exists() {
    return Err(format!("缺少 Node 运行时: {}", node_path.display()));
  }

  if !server_entry.exists() {
    return Err(format!("缺少后端入口文件: {}", server_entry.display()));
  }

  let app_data_dir = app
    .path_resolver()
    .app_data_dir()
    .ok_or_else(|| "无法定位应用数据目录".to_string())?;
  fs::create_dir_all(&app_data_dir)
    .map_err(|e| format!("无法创建应用数据目录 {}: {e}", app_data_dir.display()))?;

  let db_path = app_data_dir.join("todo.db");

  Command::new(node_path)
    .arg(server_entry)
    .current_dir(server_dir)
    .env("NODE_ENV", "production")
    .env("PORT", "3001")
    .env("DB_PATH", db_path)
    .spawn()
    .map_err(|e| format!("启动内置后端失败: {e}"))
}

fn stop_backend(app: &tauri::AppHandle) {
  let state = app.state::<BackendState>();
  let child = {
    let mut guard = state.0.lock().expect("backend mutex poisoned");
    guard.take()
  };

  if let Some(mut child) = child {
    let _ = child.kill();
    let _ = child.wait();
  }
}

fn main() {
  tauri::Builder::default()
    .manage(BackendState(Mutex::new(None)))
    .setup(|app| {
      if !is_backend_healthy() {
        let child = spawn_backend(&app.handle())?;
        let state = app.state::<BackendState>();
        *state.0.lock().expect("backend mutex poisoned") = Some(child);

        if !wait_backend_ready(Duration::from_secs(8)) {
          return Err("内置后端启动超时".into());
        }
      }

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while running tauri application")
    .run(|app, event| {
      if matches!(event, tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }) {
        stop_backend(app);
      }
    });
}
