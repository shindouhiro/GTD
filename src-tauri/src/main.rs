#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener, TcpStream};
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::Manager;

struct BackendState {
  child: Mutex<Option<Child>>,
  port: Mutex<u16>,
}

fn is_backend_healthy(port: u16) -> bool {
  let addr_str = format!("127.0.0.1:{}", port);
  let addr: SocketAddr = match addr_str.parse() {
    Ok(addr) => addr,
    Err(_) => return false,
  };

  let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_millis(500)) {
    Ok(stream) => stream,
    Err(_) => return false,
  };

  let _ = stream.set_read_timeout(Some(Duration::from_millis(500)));
  let _ = stream.set_write_timeout(Some(Duration::from_millis(500)));

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

fn wait_backend_ready(port: u16, timeout: Duration) -> bool {
  let start = Instant::now();
  while start.elapsed() <= timeout {
    if is_backend_healthy(port) {
      return true;
    }
    std::thread::sleep(Duration::from_millis(300));
  }
  false
}

fn find_available_port(start_port: u16) -> Option<u16> {
  for port in start_port..65535 {
    if TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok() {
      return Some(port);
    }
  }
  None
}

fn spawn_backend(app: &tauri::AppHandle, port: u16) -> Result<Child, String> {
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
    .env("PORT", port.to_string())
    .env("DB_PATH", db_path)
    .spawn()
    .map_err(|e| format!("启动内置后端失败: {e}"))
}

fn stop_backend(app: &tauri::AppHandle) {
  let state = app.state::<BackendState>();
  let child = {
    let mut guard = state.child.lock().expect("backend mutex poisoned");
    guard.take()
  };

  if let Some(mut child) = child {
    let _ = child.kill();
    let _ = child.wait();
  }
}

fn main() {
  tauri::Builder::default()
    .manage(BackendState {
      child: Mutex::new(None),
      port: Mutex::new(3001),
    })
    .setup(|app| {
      let port = find_available_port(3001).ok_or("找不到可用的网络端口")?;
      
      // 更新状态中的端口
      {
        let state = app.state::<BackendState>();
        *state.port.lock().unwrap() = port;
      }

      match spawn_backend(&app.handle(), port) {
        Ok(child) => {
          let state = app.state::<BackendState>();
          *state.child.lock().expect("backend mutex poisoned") = Some(child);
        }
        Err(e) => {
          eprintln!("Backend spawn failed: {}", e);
          let _ = tauri::api::dialog::message(
            None,
            "启动失败",
            format!("后端服务启动失败: {}\n请检查磁盘空间或权限。", e)
          );
          return Err(e.into());
        }
      }

      // 等待就绪
      if !wait_backend_ready(port, Duration::from_secs(15)) {
        let _ = tauri::api::dialog::message(
          None,
          "启动超时",
          "内置后端服务启动超时，请尝试重新启动应用。"
        );
        return Err("内置后端启动超时".into());
      }

      // 注入动态端口到前端
      let api_url = format!("http://127.0.0.1:{}/api", port);
      let window = app.get_window("main").unwrap();
      let _ = window.eval(&format!("window.__TAURI_API_URL__ = '{}';", api_url));

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
