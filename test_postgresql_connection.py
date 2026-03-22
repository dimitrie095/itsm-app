#!/usr/bin/env python3
"""
Test PostgreSQL connection by attempting TCP connection to the host and port.
"""

import os
import sys
import socket
import re

def parse_database_url(url):
    """Parse PostgreSQL DATABASE_URL format."""
    # Example: postgresql://user:pass@host:port/database?schema=public
    pattern = r'postgresql://(?:([^:]+):([^@]+)@)?([^:/]+)(?::(\d+))?/([^?]+)'
    match = re.match(pattern, url)
    if not match:
        return None
    user, password, host, port, database = match.groups()
    if port is None:
        port = 5432
    else:
        port = int(port)
    return {
        'host': host,
        'port': port,
        'database': database,
        'user': user,
        'password': password
    }

def test_tcp_connection(host, port, timeout=5):
    """Test TCP connection to host:port."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.connect((host, port))
        sock.close()
        return True
    except Exception as e:
        return False

def main():
    url = os.environ.get('DATABASE_URL')
    if not url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        sys.exit(1)
    
    print(f"DATABASE_URL: {url}")
    
    parsed = parse_database_url(url)
    if not parsed:
        print("ERROR: Invalid DATABASE_URL format.")
        sys.exit(1)
    
    print(f"Testing TCP connection to {parsed['host']}:{parsed['port']}...")
    if test_tcp_connection(parsed['host'], parsed['port']):
        print("SUCCESS: TCP connection to PostgreSQL server successful.")
        print("Note: This only tests if PostgreSQL is listening on the port.")
        print("Authentication and database access are not tested.")
        sys.exit(0)
    else:
        print("ERROR: Cannot connect to PostgreSQL server.")
        print("Make sure PostgreSQL is running and accessible.")
        sys.exit(1)

if __name__ == '__main__':
    main()