#!/bin/bash

set -e

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    key="$1"
    case $key in
        --debug)
            DEBUG=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

source ~/.bashrc
BUN_PATH="$(which bun)"
if [ "$DEBUG" = true ]; then
    env NODE_ENV=development "$BUN_PATH" --watch src/index.ts
else
    env NODE_ENV=production "$BUN_PATH" src/index.ts
fi