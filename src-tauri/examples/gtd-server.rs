use std::path::PathBuf;

use gtd_desktop::backend::{self, BackendConfig};
use tokio::sync::oneshot;

#[tokio::main]
async fn main() {
    let mut config = BackendConfig::server_from_env();
    if config.static_dir.is_none() {
        config.static_dir = Some(PathBuf::from("../packages/client/dist"));
    }

    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    tokio::spawn(async move {
        let _ = tokio::signal::ctrl_c().await;
        let _ = shutdown_tx.send(());
    });

    if let Err(error) = backend::serve(config, None, shutdown_rx).await {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
