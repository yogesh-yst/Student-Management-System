# Waitress configuration file for Windows
# Waitress is a Windows-compatible WSGI server

import os

# Server configuration
host = '0.0.0.0'
port = 5000
threads = 4  # Number of threads to handle requests
connection_limit = 1000
cleanup_interval = 30
channel_timeout = 120

# Logging
url_scheme = 'http'

# For production, you might want to adjust these values:
# - threads: Number of threads (typically 4-8)
# - connection_limit: Maximum number of simultaneous connections
# - cleanup_interval: How often to clean up inactive connections
# - channel_timeout: Timeout for individual requests (good for report generation)

def get_config():
    """Return configuration dictionary for waitress"""
    return {
        'host': host,
        'port': port,
        'threads': threads,
        'connection_limit': connection_limit,
        'cleanup_interval': cleanup_interval,
        'channel_timeout': channel_timeout,
        'url_scheme': url_scheme,
    }
