#!/bin/bash

# Build Rust audio processor as binary for distribution
echo "Building Rust audio processor..."

cd audio_processor

# Build for release
cargo build --release

# Create binaries directory
mkdir -p ../electron-binaries

# Copy binary based on platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    cp target/release/audio_processor ../electron-binaries/audio_processor-macos
    echo "Built macOS binary: electron-binaries/audio_processor-macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    cp target/release/audio_processor ../electron-binaries/audio_processor-linux
    echo "Built Linux binary: electron-binaries/audio_processor-linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    cp target/release/audio_processor.exe ../electron-binaries/audio_processor-windows.exe
    echo "Built Windows binary: electron-binaries/audio_processor-windows.exe"
fi

echo "Rust binary build complete!"