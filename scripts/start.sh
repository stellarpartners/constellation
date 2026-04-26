#!/bin/bash
# Constellation Studio CMS - Startup Script
# Starts the Flask API server and opens the UI in browser

echo "🌟 Starting Constellation Studio CMS..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if API is already running
if curl -s http://localhost:5000/api/stats > /dev/null 2>&1; then
    echo "✅ API server is already running on port 5000"
else
    echo "🚀 Starting Flask API server..."
    
    # Kill any existing processes on port 5000
    lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs -r kill -9 2>/dev/null
    
    # Start the server in background
    python3 api_server.py &
    SERVER_PID=$!
    
    echo "Server started with PID: $SERVER_PID"
    sleep 5
    
    if curl -s http://localhost:5000/api/stats > /dev/null 2>&1; then
        echo "✅ API server started successfully!"
    else
        echo "❌ Failed to start API server. Check console output."
        kill $SERVER_PID 2>/dev/null
        exit 1
    fi
fi

echo ""
echo "🎨 Constellation Studio UI is ready at: http://localhost:5000"
echo ""
echo "Features:"
echo "  • Cross-platform journalists (working at multiple outlets)"
echo "  • Top media outlets by journalist count"
echo "  • Search functionality for journalists and outlets"
echo "  • Bidirectional navigation between entities"
echo ""

# Open in default browser if on Linux/Mac
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5000 &>/dev/null || echo "⚠️  Could not open browser automatically. Visit: http://localhost:5000"
elif command -v open &> /dev/null; then
    open http://localhost:5000 &>/dev/null || echo "⚠️  Could not open browser automatically. Visit: http://localhost:5000"
else
    echo "⚠️  Could not detect browser command. Visit: http://localhost:5000"
fi

echo ""
echo "To stop the server, press Ctrl+C"
