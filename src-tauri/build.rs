fn main() {
    if std::env::var_os("CARGO_FEATURE_DESKTOP_APP").is_some() {
        tauri_build::build()
    }
}
