use tauri::{
    menu::PredefinedMenuItem,
    tray::TrayIconEvent,
    Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // ── Plugins ──
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_single_instance::init(|app, _args, _cwd| {
                // Another instance tried to launch → focus the existing window.
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.unminimize();
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }),
        )
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        // ── Setup ──
        .setup(|app| {
            // Build tray menu
            let header = tauri::menu::MenuItem::with_id(app, "header", "Rift", false, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let show = tauri::menu::MenuItem::with_id(app, "show", "Show Rift", true, None::<&str>)?;
            let quit = tauri::menu::MenuItem::with_id(app, "quit", "Quit Rift", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&header, &separator, &show, &quit])?;

            // Attach menu to tray icon that was declared in tauri.conf.json
            if let Some(tray) = app.tray_by_id("main-tray") {
                tray.set_menu(Some(menu))?;
                tray.on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                });
                tray.on_tray_icon_event(|tray, event| {
                    if matches!(event, TrayIconEvent::DoubleClick { .. }) {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.unminimize();
                            let _ = w.set_focus();
                        }
                    }
                });
            }

            Ok(())
        })
        // ── Close-to-tray: hide window instead of quitting ──
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the window from actually closing — just hide it.
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
