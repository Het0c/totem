use std::{env, time::Duration};

use reqwest::{Client, Method};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct OctoprintRequest {
    endpoint: String,
    method: String,
    body: Option<Value>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct OctoprintResponse {
    status: u16,
    content_type: Option<String>,
    body: Option<Value>,
}

#[tauri::command]
async fn octoprint_request(request: OctoprintRequest) -> Result<OctoprintResponse, String> {
    if !request.endpoint.starts_with("/api/") || request.endpoint.contains("..") {
        return Err("Endpoint OctoPrint no permitido".into());
    }

    let method = match request.method.as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        _ => return Err("Método HTTP no permitido".into()),
    };
    let base_url = env::var("OCTOPRINT_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:5000".into())
        .trim_end_matches('/')
        .to_owned();
    let api_key = env::var("OCTOPRINT_API_KEY").unwrap_or_default();
    let client = Client::builder()
        .timeout(Duration::from_secs(8))
        .build()
        .map_err(|error| error.to_string())?;

    let mut outgoing = client
        .request(method, format!("{}{}", base_url, request.endpoint))
        .header("Accept", "application/json");
    if !api_key.is_empty() {
        outgoing = outgoing.header("X-Api-Key", api_key);
    }
    if let Some(body) = request.body {
        outgoing = outgoing.json(&body);
    }

    let incoming = outgoing.send().await.map_err(|error| error.to_string())?;
    let status = incoming.status().as_u16();
    let content_type = incoming
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .map(str::to_owned);
    let bytes = incoming.bytes().await.map_err(|error| error.to_string())?;
    let body = if bytes.is_empty() {
        None
    } else {
        serde_json::from_slice(&bytes).ok()
    };

    Ok(OctoprintResponse {
        status,
        content_type,
        body,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![octoprint_request])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
