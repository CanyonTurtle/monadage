# Monadage Deployment Guide

This guide covers deploying Monadage to an EC2 instance with automatic SSL certificates and GitHub Actions.

## Prerequisites

- EC2 instance with Nix package manager installed
- Domain name pointing to your EC2 instance
- GitHub repository with Actions enabled

## Initial Setup

### 1. EC2 Instance Setup

```bash
# Install Nix (if not already installed)
sh <(curl -L https://nixos.org/nix/install) --daemon

# Clone the repository
git clone https://github.com/your-username/monadage.git
cd monadage

# Enable flakes
mkdir -p ~/.config/nix
echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
```

### 2. Environment Configuration

```bash
# Copy the environment template
cp production.env.example production.env

# Edit with your actual values
nano production.env
```

Required values:
- `DOMAIN_NAME`: Your domain (e.g., `monadage.yourdomain.com`)
- `SSL_EMAIL`: Your email for Let's Encrypt certificates
- `FLASK_SECRET_KEY`: A secure random string

### 3. GitHub Actions Setup

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

- `EC2_HOST`: Your EC2 instance public IP or hostname
- `EC2_USER`: SSH username (usually `ubuntu` or `ec2-user`)
- `EC2_SSH_KEY`: Private SSH key for accessing the instance
- `EC2_PORT`: SSH port (default: 22)

### 4. Initial Deployment

```bash
# Test the nix environment
nix develop

# Run initial deployment
./deploy.sh
```

## Automatic Deployment

After setup, every push to the `main` branch will automatically:

1. SSH to your EC2 instance
2. Pull the latest code
3. Enter the nix environment
4. Run the deployment script
5. Perform health checks

## Manual Operations

### Start/Stop Services

```bash
# Enter nix environment
nix develop

# Deploy (starts services)
./deploy.sh

# Stop services
pkill -f gunicorn
kill $(cat pids/nginx.pid)
```

### View Logs

```bash
# Application logs
tail -f logs/gunicorn_error.log

# Nginx logs
tail -f /var/log/nginx/monadage_access.log
```

### SSL Certificate Renewal

```bash
# Manual renewal (auto-renewed in deploy.sh)
certbot renew
```

## Architecture

```
Internet → nginx:443 (SSL) → gunicorn:5000 (Flask app)
```

- **nginx**: Handles SSL termination, static files, rate limiting
- **gunicorn**: Runs the Flask application with multiple workers
- **certbot**: Manages SSL certificates automatically

## Security Features

- SSL/TLS encryption with auto-renewal
- Rate limiting on API endpoints
- Security headers (HSTS, CSP, etc.)
- Process isolation (non-root user)
- Secrets managed via environment variables

## Troubleshooting

### Common Issues

1. **SSL certificate errors**: Check domain DNS points to EC2 IP
2. **Application not responding**: Check `logs/gunicorn_error.log`
3. **Nginx won't start**: Check `nginx.conf` syntax with `nginx -t`

### Health Checks

```bash
# Check if services are running
ps aux | grep gunicorn
ps aux | grep nginx

# Test application locally
curl http://127.0.0.1:5000/

# Test through nginx
curl -k https://your-domain.com/
```

## Development vs Production

- **Development**: `nix develop` then `python main.py --web`
- **Production**: `nix develop --command ./deploy.sh`

The same nix environment ensures consistency between development and production.