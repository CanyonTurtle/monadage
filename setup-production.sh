#!/usr/bin/env bash

# Monadage Production Server Setup Script
# This script is idempotent - safe to run multiple times

set -euo pipefail

# Configuration
REPO_URL="git@github.com:canyonturtle/monadage.git"
REPO_DIR="/home/$USER/monadage"
NIX_CONFIG_DIR="$HOME/.config/nix"
NIX_CONF="$NIX_CONFIG_DIR/nix.conf"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

error() {
    echo -e "${RED}❌${NC} $1"
    exit 1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root. Run as the user that will deploy the application."
fi

log "🚀 Starting Monadage production server setup..."

# 1. Install Nix if not present
if command -v nix &> /dev/null; then
    success "Nix is already installed"
    nix --version
else
    log "📦 Installing Nix package manager..."
    
    # Download and run Nix installer
    curl -L https://nixos.org/nix/install > /tmp/nix-installer.sh
    
    # Run installer with daemon mode
    sh /tmp/nix-installer.sh --daemon --yes
    
    # Clean up installer
    rm /tmp/nix-installer.sh
    
    # Source nix profile for current session
    if [[ -f /etc/profile.d/nix.sh ]]; then
        source /etc/profile.d/nix.sh
    elif [[ -f "$HOME/.nix-profile/etc/profile.d/nix.sh" ]]; then
        source "$HOME/.nix-profile/etc/profile.d/nix.sh"
    fi
    
    success "Nix installed successfully"
fi

# 2. Create Nix config directory if needed
if [[ ! -d "$NIX_CONFIG_DIR" ]]; then
    log "📁 Creating Nix config directory..."
    mkdir -p "$NIX_CONFIG_DIR"
    success "Created $NIX_CONFIG_DIR"
fi

# 3. Enable flakes if not already enabled
if [[ -f "$NIX_CONF" ]] && grep -q "experimental-features.*flakes" "$NIX_CONF"; then
    success "Nix flakes already enabled"
else
    log "🔧 Enabling Nix flakes..."
    
    # Create or append to nix.conf
    if [[ -f "$NIX_CONF" ]]; then
        # Check if experimental-features line exists
        if grep -q "^experimental-features" "$NIX_CONF"; then
            # Update existing line to include flakes
            sed -i 's/^experimental-features = .*/experimental-features = nix-command flakes/' "$NIX_CONF"
        else
            # Add new line
            echo "experimental-features = nix-command flakes" >> "$NIX_CONF"
        fi
    else
        # Create new file
        echo "experimental-features = nix-command flakes" > "$NIX_CONF"
    fi
    
    success "Nix flakes enabled"
fi

# 4. Clone repository if not present
if [[ -d "$REPO_DIR" ]]; then
    success "Repository directory already exists"
    
    # Check if it's a git repo
    if [[ -d "$REPO_DIR/.git" ]]; then
        log "📥 Updating existing repository..."
        cd "$REPO_DIR"
        
        # Check if we have the right remote
        current_remote=$(git remote get-url origin 2>/dev/null || echo "")
        if [[ "$current_remote" != "$REPO_URL" ]]; then
            warning "Remote URL mismatch. Current: $current_remote, Expected: $REPO_URL"
            log "Updating remote URL..."
            git remote set-url origin "$REPO_URL"
        fi
        
        # Fetch latest changes
        git fetch origin
        git reset --hard origin/main
        success "Repository updated to latest main branch"
    else
        error "Directory $REPO_DIR exists but is not a git repository"
    fi
else
    log "📥 Cloning repository..."
    
    # Create parent directory if needed
    mkdir -p "$(dirname "$REPO_DIR")"
    
    # Clone the repository
    git clone "$REPO_URL" "$REPO_DIR"
    cd "$REPO_DIR"
    
    success "Repository cloned successfully"
fi

# 5. Verify repository structure
cd "$REPO_DIR"
required_files=("flake.nix" "deploy.sh" "wsgi.py" "production.env.example")

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        success "Found required file: $file"
    else
        error "Missing required file: $file"
    fi
done

# 6. Check if production.env exists
if [[ ! -f "production.env" ]]; then
    warning "production.env not found. You need to create it from production.env.example"
    log "Run: cp production.env.example production.env && nano production.env"
else
    success "production.env file exists"
fi

# 7. Make deploy script executable
if [[ -f "deploy.sh" ]]; then
    chmod +x deploy.sh
    success "deploy.sh is executable"
fi

# 8. Test Nix environment
log "🧪 Testing Nix environment..."
if nix develop --command echo "Nix environment test successful"; then
    success "Nix environment is working"
else
    error "Nix environment test failed"
fi

# 8.5. Setup nginx capabilities for privileged ports
log "🔐 Setting up nginx capabilities for privileged ports..."
NGINX_PATH=$(nix develop --command which nginx 2>/dev/null || echo "")
if [[ -n "$NGINX_PATH" ]]; then
    if getcap "$NGINX_PATH" 2>/dev/null | grep -q "cap_net_bind_service"; then
        success "Nginx already has cap_net_bind_service capability"
    else
        log "Setting cap_net_bind_service capability on nginx..."
        if sudo setcap 'cap_net_bind_service=+ep' "$NGINX_PATH"; then
            success "Successfully set nginx capabilities"
        else
            warning "Failed to set nginx capabilities automatically"
            warning "You'll need to run this manually before deployment:"
            warning "  sudo setcap 'cap_net_bind_service=+ep' $NGINX_PATH"
        fi
    fi
else
    warning "Could not find nginx binary. Capabilities will be set during deployment."
fi

# 9. Create necessary directories
directories=(
    "logs" "pids" "certbot" "ssl" "letsencrypt" "letsencrypt-work"
    "tmp/client_body" "tmp/proxy" "tmp/fastcgi" "tmp/uwsgi" "tmp/scgi"
    "temp/uploads" "temp/outputs"
)
for dir in "${directories[@]}"; do
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        success "Created directory: $dir"
    else
        success "Directory already exists: $dir"
    fi
done

log "🎉 Production server setup complete!"
echo
echo "Next steps:"
echo "1. Configure production.env with your domain and SSL email"
echo "2. Set up DNS to point your domain to this server"
echo "3. Configure GitHub Actions secrets for automated deployment"
echo "4. Run ./deploy.sh to start the application"
echo
echo "Repository location: $REPO_DIR"
echo "To deploy manually: cd $REPO_DIR && nix develop --command ./deploy.sh"