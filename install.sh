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

chown $REAL_USER:$REAL_USER ./glide -R

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

echo -e "${GREEN}✅ Glide installation complete!${NC}"

cd ..
echo -n "Would you like to install the glide auto updater? (y/n): "
read answer

if [ "$answer" = "y" ]; then
    echo -e "${YELLOW}⏳ Installing auto updater...${NC}"
    curl -fsSL https://raw.githubusercontent.com/Spire-Panel/glide-updater/main/install.sh | bash
    echo -e "${GREEN}✅ Auto updater installed!${NC}"
fi
