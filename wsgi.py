#!/usr/bin/env python3
"""
WSGI entry point for Monadage application.
"""

import os
import sys
from pathlib import Path

# Add the project directory to Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import the existing web server
from web_server import create_web_app

# Create the Flask application
app = create_web_app()

# Configure Flask to trust proxy headers (nginx reverse proxy)
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Production configuration
app.config.update(
    SECRET_KEY=os.environ.get('FLASK_SECRET_KEY', 'dev-key-change-in-production'),
    DEBUG=False,
    TESTING=False,
)

if __name__ == "__main__":
    # For testing only - use gunicorn in production
    app.run(host='127.0.0.1', port=5000, debug=False)