use tauri::{menu::{Menu, MenuItem}, tray::TrayIconBuilder, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_autostart::init(
      tauri_plugin_autostart::MacosLauncher::LaunchAgent,
      None::<Vec<&str>>,
    ))
    .setup(|app| {
      let show = MenuItem::with_id(app, "show", "표시/숨기기", true, None::<&str>)?;
      let refresh = MenuItem::with_id(app, "refresh", "새로고침", true, None::<&str>)?;
      let always_on_top = MenuItem::with_id(app, "always_on_top", "항상 위", true, None::<&str>)?;
      let settings = MenuItem::with_id(app, "settings", "설정", true, None::<&str>)?;
      let logout = MenuItem::with_id(app, "logout", "로그아웃", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "종료", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &refresh, &always_on_top, &settings, &logout, &quit])?;
      TrayIconBuilder::with_id("main").menu(&menu).tooltip("삼정 학사일정").on_menu_event(|app, event| {
        let Some(window) = app.get_webview_window("main") else { return };
        match event.id.as_ref() {
          "show" => { if window.is_visible().unwrap_or(false) { let _ = window.hide(); } else { let _ = window.show(); let _ = window.set_focus(); } }
          "refresh" => { let _ = window.emit("calendar://refresh", ()); }
          "always_on_top" => { let current = window.is_always_on_top().unwrap_or(false); let _ = window.set_always_on_top(!current); }
          "settings" => { let _ = window.emit("calendar://settings", ()); }
          "logout" => { let _ = window.emit("calendar://logout", ()); }
          "quit" => app.exit(0),
          _ => {}
        }
      }).build(app)?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running school calendar widget");
}
