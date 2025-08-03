#!/bin/bash

set -e

source ~/.bashrc


# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# GitHub Variables
GITHUB_REPO="Spire-Panel/glide"

# Default values
DEBUG_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --debug)
            DEBUG_MODE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

echo -e "${YELLOW}🚀 Starting Glide installation...${NC}"
[ "$DEBUG_MODE" = true ] && echo -e "${YELLOW}🔧 Debug mode enabled${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Please run as root or with sudo${NC}"
    exit 1
fi

REAL_USER=${SUDO_USER:-$USER}

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo -e "${YELLOW}⚠️  Bun is not installed. Installing Bun...${NC}"
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
    source ~/.bashrc
fi

echo -e "${GREEN}✅ Bun installed!${NC}"

# Clone Repository
echo -e "${YELLOW}⏳ Cloning repository...${NC}"
git clone https://github.com/$GITHUB_REPO.git ./glide

while [ ! -d "./glide" ]; do
    sleep 1
done

cd ./glide

echo -e "${GREEN}✅ Repository cloned!${NC}"

# Install Dependencies
echo -e "${YELLOW}⏳ Installing dependencies...${NC}"
bun install
echo -e "${GREEN}✅ Dependencies installed!${NC}"

echo -e "${YELLOW}⏳ Generating config...${NC}"

if command -v curl > /dev/null 2>&1; then
    PUBLIC_IP=$(curl -s https://api.ipify.org)
elif command -v wget > /dev/null 2>&1; then
    PUBLIC_IP=$(wget -qO- https://api.ipify.org)
else
    echo "Error: Neither curl nor wget is installed." >&2
    exit 1
fi

echo '{"host": "'${PUBLIC_IP}'", "port": 3000, "token": "'$(cat /proc/sys/kernel/random/uuid)'", "debug": '$DEBUG_MODE'}' > ./spire_config.json

chown $REAL_USER:$REAL_USER ./glide -R

SERVICE_FILE="/etc/systemd/system/glide.service"

# Create the service file with debug option if enabled
cat > $SERVICE_FILE <<EOL
[Unit]
Description=Glide Daemon Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
$(if [ "$DEBUG_MODE" = true ]; then
    echo "ExecStart=$(pwd)/glide.sh --debug"
else
    echo "ExecStart=$(pwd)/glide.sh"
    echo "# Uncomment the line below to enable debug logging"
    echo "#ExecStart=$(pwd)/glide.sh --debug"
fi)
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOL

# Enable and start the service
echo -e "${YELLOW}⏳ Enabling and starting service...${NC}"
systemctl enable --now glide
systemctl status glide

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Service enabled and started!${NC}"
else
    echo -e "${YELLOW}⚠️  Service failed to start. Please check the logs for more information.${NC}"
fi
    
echo -e "${GREEN}✅ Glide installation complete!${NC}"

exit 0
