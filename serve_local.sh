#!/bin/bash
# Local development server for Anki Stats Dashboard

PORT=${1:-8000}
echo "🚀 Starting local server..."
echo "📂 Serving from: $(pwd)/public"
echo "🌐 Open in browser: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server $PORT --directory public