#!/bin/bash

# HiBeats Subgraph Setup Script for ORMI
# This script automates the subgraph initialization process

echo "🚀 HiBeats ORMI Subgraph Setup"
echo "================================"
echo ""

# Configuration
CONTRACT_ADDRESS="0x09F0e57eA34D2c999CB31674C5Ae119A8c16ba59"
CONTRACT_NAME="SocialGraph"
NETWORK="somnia-testnet"
SUBGRAPH_NAME="hibeats-social-subgraph"

echo "📋 Configuration:"
echo "  Contract: $CONTRACT_NAME"
echo "  Address: $CONTRACT_ADDRESS"
echo "  Network: $NETWORK"
echo ""

# Check if graph-cli is installed
echo "🔍 Checking Graph CLI..."
if ! command -v graph &> /dev/null
then
    echo "❌ Graph CLI not found. Installing..."
    npm install -g @graphprotocol/graph-cli
else
    echo "✅ Graph CLI installed"
fi
echo ""

# Initialize subgraph
echo "📦 Initializing subgraph..."
graph init \
  --contract-name $CONTRACT_NAME \
  --from-contract $CONTRACT_ADDRESS \
  --network $NETWORK \
  --protocol ethereum \
  --index-events \
  $SUBGRAPH_NAME

echo ""
echo "✅ Subgraph initialized!"
echo ""
echo "📝 Next steps:"
echo "  1. cd $SUBGRAPH_NAME"
echo "  2. Edit schema.graphql (see ORMI_SUBGRAPH_SETUP_GUIDE.md)"
echo "  3. Edit src/social-graph.ts (see guide)"
echo "  4. Run: graph codegen && graph build"
echo "  5. Deploy to ORMI (see guide for deploy command)"
echo ""
echo "🔗 Resources:"
echo "  - Guide: ../ORMI_SUBGRAPH_SETUP_GUIDE.md"
echo "  - ORMI Dashboard: https://subgraph.somnia.network/"
echo ""
