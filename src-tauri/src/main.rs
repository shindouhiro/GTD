#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::net::SocketAddr;
use std::sync::{mpsc, Mutex};
use std::time::Duration;

use gtd_desktop::backend::{self, BackendConfig, RunMode};
use tauri::{
    CustomMenuItem, Manager, Menu, Submenu, SystemTray, SystemTrayEvent, SystemTrayMenu,
    SystemTrayMenuItem,
};
use tokio::sync::oneshot;

struct BackendState {
    shutdown: Mutex<Option<oneshot::Sender<()>>>,
    port: Mutex<u16>,
}

fn stop_backend(app: &tauri::AppHandle) {
    let state = app.state::<BackendState>();
    let shutdown = {
        let mut guard = state.shutdown.lock().expect("backend mutex poisoned");
        guard.take()
    };

    if let Some(sender) = shutdown {
        let _ = sender.send(());
    }
}

fn inject_runtime(window: &tauri::Window, addr: SocketAddr) {
    let api_url = format!("http://{}/api", addr);
    let script = format!(
        "window.__GTD_DESKTOP__ = true; window.__TAURI_API_URL__ = '{}';",
        api_url
    );
    let _ = window.eval(&script);
}

fn menu_item(id: &str, title: &str, accelerator: Option<&str>) -> CustomMenuItem {
    let item = CustomMenuItem::new(id.to_string(), title.to_string());
    match accelerator {
        Some(accelerator) => item.accelerator(accelerator),
        None => item,
    }
}

fn build_app_menu() -> Menu {
    let app_menu = Menu::new()
        .add_item(menu_item("app-about", "关于 GTD", None))
        .add_item(menu_item("app-settings", "偏好设置...", Some("CmdOrCtrl+,")))
        .add_native_item(tauri::MenuItem::Separator)
        .add_item(menu_item("app-show-window", "显示窗口", None))
        .add_item(menu_item("app-hide-window", "隐藏窗口", Some("CmdOrCtrl+H")))
        .add_item(menu_item("app-quit", "退出 GTD", Some("CmdOrCtrl+Q")));

    let navigation_menu = Menu::new()
        .add_item(menu_item("nav-home", "任务首页", Some("CmdOrCtrl+1")))
        .add_item(menu_item("nav-categories", "分类管理", Some("CmdOrCtrl+2")))
        .add_item(menu_item("nav-statistics", "统计", Some("CmdOrCtrl+3")))
        .add_item(menu_item("nav-settings", "设置", Some("CmdOrCtrl+4")));

    let view_menu = Menu::new()
        .add_item(menu_item("view-calendar", "日历视图", Some("CmdOrCtrl+Shift+C")))
        .add_item(menu_item("view-table", "列表视图", Some("CmdOrCtrl+Shift+T")))
        .add_native_item(tauri::MenuItem::Separator)
        .add_item(menu_item("view-refresh", "刷新数据", Some("CmdOrCtrl+R")));

    let window_menu = Menu::new()
        .add_item(menu_item("window-show", "显示窗口", None))
        .add_item(menu_item("window-minimize", "最小化", Some("CmdOrCtrl+M")))
        .add_item(menu_item("window-fullscreen", "切换全屏", Some("CmdOrCtrl+Shift+F")))
        .add_item(menu_item("window-reload", "重新载入", Some("CmdOrCtrl+Shift+R")))
        .add_native_item(tauri::MenuItem::Separator)
        .add_item(menu_item("window-close", "关闭窗口", Some("CmdOrCtrl+W")));

    Menu::new()
        .add_submenu(Submenu::new("GTD", app_menu))
        .add_submenu(Submenu::new("导航", navigation_menu))
        .add_submenu(Submenu::new("视图", view_menu))
        .add_submenu(Submenu::new("窗口", window_menu))
}

fn build_tray_menu() -> SystemTrayMenu {
    SystemTrayMenu::new()
        .add_item(CustomMenuItem::new(
            "tray-show-window".to_string(),
            "显示 GTD",
        ))
        .add_item(CustomMenuItem::new("tray-nav-home".to_string(), "任务首页"))
        .add_item(CustomMenuItem::new(
            "tray-nav-categories".to_string(),
            "分类管理",
        ))
        .add_item(CustomMenuItem::new("tray-nav-statistics".to_string(), "统计"))
        .add_item(CustomMenuItem::new("tray-nav-settings".to_string(), "设置"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new(
            "tray-view-calendar".to_string(),
            "切换到日历视图",
        ))
        .add_item(CustomMenuItem::new(
            "tray-view-table".to_string(),
            "切换到列表视图",
        ))
        .add_item(CustomMenuItem::new("tray-refresh".to_string(), "刷新数据"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new(
            "tray-hide-window".to_string(),
            "隐藏窗口",
        ))
        .add_item(CustomMenuItem::new("tray-quit".to_string(), "退出 GTD"))
}

fn build_system_tray() -> SystemTray {
    let tray = SystemTray::new()
        .with_menu(build_tray_menu())
        .with_tooltip("GTD");

    #[cfg(target_os = "macos")]
    let tray = tray
        .with_title("GTD")
        .with_icon_as_template(true)
        .with_menu_on_left_click(true);

    tray
}

fn emit_frontend_command(window: &tauri::Window, command: &str) {
    let script = format!(
        "window.dispatchEvent(new CustomEvent('gtd-menu-command', {{ detail: '{}' }}));",
        command
    );
    let _ = window.eval(&script);
}

fn show_main_window(app: &tauri::AppHandle) -> Option<tauri::Window> {
    let window = app.get_window("main")?;
    let _ = window.show();
    let _ = window.set_focus();
    Some(window)
}

fn handle_menu_event(window: &tauri::Window, menu_item_id: &str) {
    match menu_item_id {
        "app-about" => {
            let _ = tauri::api::dialog::message::<tauri::Wry>(
                Some(window),
                "关于 GTD",
                "GTD 桌面应用\nRust 内置后端，本地数据存储。",
            );
        }
        "app-settings" | "nav-settings" => emit_frontend_command(window, "nav:settings"),
        "app-show-window" | "window-show" => {
            let _ = window.show();
            let _ = window.set_focus();
        }
        "app-hide-window" => {
            let _ = window.hide();
        }
        "app-quit" => window.app_handle().exit(0),
        "nav-home" => emit_frontend_command(window, "nav:home"),
        "nav-categories" => emit_frontend_command(window, "nav:categories"),
        "nav-statistics" => emit_frontend_command(window, "nav:statistics"),
        "view-calendar" => emit_frontend_command(window, "view:calendar"),
        "view-table" => emit_frontend_command(window, "view:table"),
        "view-refresh" => emit_frontend_command(window, "view:refresh"),
        "window-minimize" => {
            let _ = window.minimize();
        }
        "window-fullscreen" => {
            let is_fullscreen = window.is_fullscreen().unwrap_or(false);
            let _ = window.set_fullscreen(!is_fullscreen);
        }
        "window-reload" => {
            let _ = window.eval("window.location.reload();");
        }
        "window-close" => {
            let _ = window.close();
        }
        _ => {}
    }
}

fn handle_tray_menu_event(app: &tauri::AppHandle, menu_item_id: &str) {
    match menu_item_id {
        "tray-show-window" => {
            let _ = show_main_window(app);
        }
        "tray-nav-home" => {
            if let Some(window) = show_main_window(app) {
                emit_frontend_command(&window, "nav:home");
            }
        }
        "tray-nav-categories" => {
            if let Some(window) = show_main_window(app) {
                emit_frontend_command(&window, "nav:categories");
            }
        }
        "tray-nav-statistics" => {
            if let Some(window) = show_main_window(app) {
                emit_frontend_command(&window, "nav:statistics");
            }
        }
        "tray-nav-settings" => {
            if let Some(window) = show_main_window(app) {
                emit_frontend_command(&window, "nav:settings");
            }
        }
        "tray-view-calendar" => {
            if let Some(window) = show_main_window(app) {
                emit_frontend_command(&window, "view:calendar");
            }
        }
        "tray-view-table" => {
            if let Some(window) = show_main_window(app) {
                emit_frontend_command(&window, "view:table");
            }
        }
        "tray-refresh" => {
            if let Some(window) = show_main_window(app) {
                emit_frontend_command(&window, "view:refresh");
            }
        }
        "tray-hide-window" => {
            if let Some(window) = app.get_window("main") {
                let _ = window.hide();
            }
        }
        "tray-quit" => app.exit(0),
        _ => {}
    }
}

fn main() {
    tauri::Builder::default()
        .menu(build_app_menu())
        .system_tray(build_system_tray())
        .on_menu_event(|event| {
            handle_menu_event(event.window(), event.menu_item_id());
        })
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                let _ = show_main_window(app);
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                handle_tray_menu_event(app, id.as_str());
            }
            _ => {}
        })
        .manage(BackendState {
            shutdown: Mutex::new(None),
            port: Mutex::new(0),
        })
        .on_page_load(|window, _| {
            let state = window.state::<BackendState>();
            let port = *state.port.lock().expect("backend mutex poisoned");
            if port != 0 {
                inject_runtime(&window, SocketAddr::from(([127, 0, 0, 1], port)));
            }
        })
        .setup(|app| {
            let app_data_dir = app
                .path_resolver()
                .app_data_dir()
                .ok_or_else(|| "无法定位应用数据目录".to_string())?;
            fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("无法创建应用数据目录 {}: {e}", app_data_dir.display()))?;

            let config = BackendConfig {
                host: "127.0.0.1".to_string(),
                port: 0,
                db_path: app_data_dir.join("todo.db"),
                mode: RunMode::Desktop,
                static_dir: None,
                jwt_secret: "desktop-local-secret".to_string(),
            };

            let (ready_tx, ready_rx) = mpsc::channel();
            let (shutdown_tx, shutdown_rx) = oneshot::channel();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = backend::serve(config, Some(ready_tx), shutdown_rx).await {
                    eprintln!("Backend server failed: {error}");
                }
            });

            let addr = match ready_rx.recv_timeout(Duration::from_secs(15)) {
                Ok(Ok(addr)) => addr,
                Ok(Err(error)) => {
                    let _ = tauri::api::dialog::message::<tauri::Wry>(
                        None,
                        "启动失败",
                        format!("后端服务启动失败: {error}\n请检查磁盘空间或权限。"),
                    );
                    return Err(error.into());
                }
                Err(_) => {
                    let _ = tauri::api::dialog::message::<tauri::Wry>(
                        None,
                        "启动超时",
                        "内置后端服务启动超时，请尝试重新启动应用。",
                    );
                    return Err("内置后端启动超时".into());
                }
            };

            {
                let state = app.state::<BackendState>();
                *state.port.lock().expect("backend mutex poisoned") = addr.port();
                *state.shutdown.lock().expect("backend mutex poisoned") = Some(shutdown_tx);
            }

            if let Some(window) = app.get_window("main") {
                inject_runtime(&window, addr);
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app, event| {
            if matches!(
                event,
                tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
            ) {
                stop_backend(app);
            }
        });
}
