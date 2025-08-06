use actix_cors::Cors;
use actix_web::{
    error, get, post, web, App, Error, HttpRequest, HttpResponse, HttpServer, Responder, Result,
};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use std::time::Instant;
use std::{env, fs};

// Import the audio processing modules
mod audio_processor;
use audio_processor::{
    AudioError, AudioProcessor, ImportResult, PeakCache, WaveformData, CACHE_DIR, UPLOAD_DIR,
};

// Shared state for the application
struct AppState {
    audio_processor: Mutex<AudioProcessor>,
}

// API response wrapper
#[derive(Serialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    fn error<E: ToString>(error: E) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error.to_string()),
        }
    }
}

// API endpoints
#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(ApiResponse::success("OK"))
}

#[post("/api/import")]
async fn import_audio(
    req: HttpRequest,
    payload: web::Payload,
    data: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    // Get content type
    let content_type = req
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !content_type.starts_with("multipart/form-data") {
        return Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(
            "Content type must be multipart/form-data",
        )));
    }

    // Process the multipart form
    let mut processor = data.audio_processor.lock().unwrap();
    let result = processor.process_upload(payload).await;

    match result {
        Ok(import_result) => Ok(HttpResponse::Ok().json(ApiResponse::success(import_result))),
        Err(e) => Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(e))),
    }
}

#[get("/api/waveform/{cache_key}")]
async fn get_waveform(
    path: web::Path<String>,
    data: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let cache_key = path.into_inner();
    let mut processor = data.audio_processor.lock().unwrap();
    
    match processor.get_waveform(&cache_key).await {
        Ok(waveform) => Ok(HttpResponse::Ok().json(ApiResponse::success(waveform))),
        Err(e) => Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(e))),
    }
}

#[get("/api/peaks/{cache_key}")]
async fn get_peaks(
    path: web::Path<String>,
    data: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let cache_key = path.into_inner();
    let processor = data.audio_processor.lock().unwrap();
    
    match processor.get_peaks(&cache_key).await {
        Ok(peaks) => Ok(HttpResponse::Ok().json(ApiResponse::success(peaks))),
        Err(e) => Ok(HttpResponse::BadRequest().json(ApiResponse::<()>::error(e))),
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logger
    env_logger::init();
    
    // Create necessary directories
    fs::create_dir_all(*UPLOAD_DIR).expect("Failed to create upload directory");
    fs::create_dir_all(*CACHE_DIR).expect("Failed to create cache directory");

    // Initialize audio processor
    let audio_processor = AudioProcessor::new();
    let app_state = web::Data::new(AppState {
        audio_processor: Mutex::new(audio_processor),
    });

    // Start the HTTP server
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT")
        .unwrap_or_else(|_| "8081".to_string())
        .parse::<u16>()
        .expect("Invalid PORT environment variable");

    println!("Starting audio processor server on {}:{}", host, port);

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(app_state.clone())
            .service(health)
            .service(import_audio)
            .service(get_waveform)
            .service(get_peaks)
    })
    .bind((host, port))?
    .run()
    .await
}
