#!/bin/bash

echo "🚀 Starting Rian Audio Editor Services..."

# Start Rust audio processor
echo "🦀 Starting Rust audio processor on port 8081..."
cd audio_processor
PORT=8081 ./target/release/audio_processor > ../rust_audio.log 2>&1 &
RUST_PID=$!
cd ..

# Wait for Rust service to start
sleep 2

# Check if Rust service is running
if curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "✅ Rust audio processor is running (PID: $RUST_PID)"
else
    echo "❌ Failed to start Rust audio processor"
    exit 1
fi

# Start Express server
echo "📦 Starting Express server on port 5001..."
npm run dev:server &
EXPRESS_PID=$!

# Wait for Express to start
sleep 3

# Check if Express is running
if curl -s http://localhost:5001/ > /dev/null 2>&1; then
    echo "✅ Express server is running (PID: $EXPRESS_PID)"
else
    echo "❌ Failed to start Express server"
    kill $RUST_PID
    exit 1
fi

echo "
✨ All services started successfully!
   - Rust Audio Processor: http://localhost:8081
   - Express Server: http://localhost:5001
   
To stop all services, press Ctrl+C or run:
   kill $RUST_PID $EXPRESS_PID
"

# Keep script running and handle shutdown
trap "echo 'Stopping services...'; kill $RUST_PID $EXPRESS_PID 2>/dev/null; exit" INT TERM

# Wait for processes
wait