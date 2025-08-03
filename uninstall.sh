#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Please run as root or with sudo${NC}"
    exit 1
fi

SERVICE_FILE="/etc/systemd/system/glide.service"

# Stop and disable the service
echo -e "${YELLOW}⏳ Stopping and disabling service...${NC}"
systemctl stop glide
systemctl disable glide

# Remove the service file
echo -e "${YELLOW}⏳ Removing service file...${NC}"
