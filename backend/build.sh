#!/usr/bin/env bash
# Exit on error
set -o errexit

# Upgrade pip and packaging tools
pip install --upgrade pip setuptools wheel

# Install production dependencies
pip install --no-cache-dir -r requirements.txt
