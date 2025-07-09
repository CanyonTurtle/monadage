#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF="$PROJECT_DIR/nginx.conf"
PID_DIR="$PROJECT_DIR/pids"
LOG_DIR="$PROJECT_DIR/logs"

# Load environment variables
if [ -f "$PROJECT_DIR/production.env" ]; then
    source "$PROJECT_DIR/production.env"
else
    echo -e "${RED}Error: production.env not found. Copy production.env.example and configure it.${NC}"
    exit 1
fi

# Check required environment variables
required_vars=("DOMAIN_NAME" "SSL_EMAIL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var:-}" ]; then
        echo -e "${RED}Error: $var is not set in production.env${NC}"
        exit 1
    fi
done

# Create necessary directories
mkdir -p "$PID_DIR" "$LOG_DIR" "/var/www/certbot" "/var/log/nginx"

echo -e "${GREEN}🚀 Starting Monadage deployment...${NC}"

# Function to kill existing processes
cleanup_processes() {
    echo -e "${YELLOW}Cleaning up existing processes...${NC}"
    
    # Kill gunicorn processes
    pkill -f "gunicorn.*wsgi:app" || true
    
    # Kill nginx processes
    if [ -f "$PID_DIR/nginx.pid" ]; then
        kill "$(cat "$PID_DIR/nginx.pid")" || true
        rm -f "$PID_DIR/nginx.pid"
    fi
    
    # Wait for processes to stop
    sleep 2
}

# Function to generate SSL certificate
setup_ssl() {
    echo -e "${YELLOW}Setting up SSL certificate...${NC}"
    
    # Check if certificate already exists
    if [ ! -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
        echo "Generating new SSL certificate for $DOMAIN_NAME..."
        
        # Get certificate
        certbot certonly \
            --webroot \
            --webroot-path=/var/www/certbot \
            --email "$SSL_EMAIL" \
            --agree-tos \
            --no-eff-email \
            --domains "$DOMAIN_NAME" \
            --non-interactive
    else
        echo "SSL certificate already exists. Renewing if needed..."
        certbot renew --quiet
    fi
}

# Function to generate nginx configuration
generate_nginx_config() {
    echo -e "${YELLOW}Generating nginx configuration...${NC}"
    
    # SSL certificate paths
    SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
    SSL_KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
    
    # Generate nginx config from template
    sed -e "s|DOMAIN_NAME|$DOMAIN_NAME|g" \
        -e "s|SSL_CERT_PATH|$SSL_CERT_PATH|g" \
        -e "s|SSL_KEY_PATH|$SSL_KEY_PATH|g" \
        "$PROJECT_DIR/nginx.conf.template" > "$NGINX_CONF"
    
    # Update PID file location in config
    sed -i "s|/var/run/nginx/nginx.pid|$PID_DIR/nginx.pid|g" "$NGINX_CONF"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    
    # Start gunicorn
    echo "Starting gunicorn..."
    cd "$PROJECT_DIR"
    gunicorn \
        --workers 4 \
        --bind 127.0.0.1:5000 \
        --daemon \
        --pid "$PID_DIR/gunicorn.pid" \
        --access-logfile "$LOG_DIR/gunicorn_access.log" \
        --error-logfile "$LOG_DIR/gunicorn_error.log" \
        wsgi:app
    
    # Start nginx
    echo "Starting nginx..."
    nginx -c "$NGINX_CONF" -p "$PROJECT_DIR"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Check if gunicorn is running
    if [ -f "$PID_DIR/gunicorn.pid" ] && kill -0 "$(cat "$PID_DIR/gunicorn.pid")" 2>/dev/null; then
        echo "✓ Gunicorn is running"
    else
        echo -e "${RED}✗ Gunicorn is not running${NC}"
        return 1
    fi
    
    # Check if nginx is running
    if [ -f "$PID_DIR/nginx.pid" ] && kill -0 "$(cat "$PID_DIR/nginx.pid")" 2>/dev/null; then
        echo "✓ Nginx is running"
    else
        echo -e "${RED}✗ Nginx is not running${NC}"
        return 1
    fi
    
    # Test HTTP response
    if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5000/" | grep -q "200"; then
        echo "✓ Application is responding"
    else
        echo -e "${RED}✗ Application is not responding${NC}"
        return 1
    fi
}

# Main deployment flow
main() {
    cleanup_processes
    setup_ssl
    generate_nginx_config
    start_services
    verify_deployment
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Application is available at: https://$DOMAIN_NAME${NC}"
    echo ""
    echo "Useful commands:"
    echo "  View logs: tail -f $LOG_DIR/gunicorn_error.log"
    echo "  Stop services: pkill -f gunicorn && kill \$(cat $PID_DIR/nginx.pid)"
    echo "  Renew SSL: certbot renew"
}

# Run deployment
main "$@"