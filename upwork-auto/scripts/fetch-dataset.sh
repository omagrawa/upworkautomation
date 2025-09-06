#!/bin/bash

# Upwork Automation - Fetch Dataset Items
# This script fetches items from an Apify dataset by DATASET_ID

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}📊 Fetching Dataset Items...${NC}"

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and fill in your values.${NC}"
    exit 1
fi

# Load environment variables
source ../.env

# Check required environment variables
REQUIRED_VARS=(
    "APIFY_TOKEN"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: Required environment variable $var is not set!${NC}"
        echo -e "${YELLOW}Please set $var in your .env file.${NC}"
        exit 1
    fi
done

# Get DATASET_ID from command line argument or last_dataset_id.txt
if [ -n "$1" ]; then
    DATASET_ID="$1"
    echo -e "${GREEN}📋 Using dataset ID from argument: $DATASET_ID${NC}"
elif [ -f "last_dataset_id.txt" ]; then
    DATASET_ID=$(cat last_dataset_id.txt)
    echo -e "${GREEN}📋 Using dataset ID from last run: $DATASET_ID${NC}"
else
    echo -e "${RED}❌ Error: No dataset ID provided!${NC}"
    echo -e "${YELLOW}Usage: $0 <DATASET_ID>${NC}"
    echo -e "${YELLOW}Or run run-scrape-once.sh first to generate last_dataset_id.txt${NC}"
    exit 1
fi

# Validate dataset ID format
if [[ ! "$DATASET_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo -e "${RED}❌ Error: Invalid dataset ID format!${NC}"
    exit 1
fi

echo -e "${GREEN}🔑 Using token: ${APIFY_TOKEN:0:10}...${NC}"

# Fetch dataset items
echo -e "${GREEN}📥 Fetching items from dataset...${NC}"

RESPONSE=$(curl -s -H "Authorization: Bearer $APIFY_TOKEN" \
    "https://api.apify.com/v2/datasets/$DATASET_ID/items?clean=true&format=json")

# Check if the request was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to fetch dataset items!${NC}"
    exit 1
fi

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
    echo -e "${RED}❌ Error: Invalid response from API!${NC}"
    echo -e "${RED}Response: $RESPONSE${NC}"
    exit 1
fi

# Get item count
ITEM_COUNT=$(echo "$RESPONSE" | jq '. | length')

if [ "$ITEM_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No items found in dataset!${NC}"
    exit 0
fi

echo -e "${GREEN}✅ Successfully fetched $ITEM_COUNT items${NC}"

# Save items to file
OUTPUT_FILE="dataset_items_$(date +%Y%m%d_%H%M%S).json"
echo "$RESPONSE" > "$OUTPUT_FILE"

echo -e "${GREEN}💾 Items saved to: $OUTPUT_FILE${NC}"

# Display summary of items
echo -e "${BLUE}📋 Dataset Summary:${NC}"
echo -e "${BLUE}├─ Total items: $ITEM_COUNT${NC}"
echo -e "${BLUE}├─ Dataset ID: $DATASET_ID${NC}"
echo -e "${BLUE}└─ Output file: $OUTPUT_FILE${NC}"

# Show first few items as preview
echo -e "${BLUE}🔍 Preview of first 3 items:${NC}"
echo "$RESPONSE" | jq '.[0:3] | .[] | {title: .title, jobUrl: .jobUrl, budget: .budget, country: .country}' 2>/dev/null || echo -e "${YELLOW}⚠️  Could not parse preview${NC}"

# Optional: Pretty print all items
if [ "$2" = "--pretty" ]; then
    echo -e "${GREEN}📄 Pretty printing all items...${NC}"
    echo "$RESPONSE" | jq '.' > "${OUTPUT_FILE%.json}_pretty.json"
    echo -e "${GREEN}💾 Pretty version saved to: ${OUTPUT_FILE%.json}_pretty.json${NC}"
fi

# Optional: Filter by specific criteria
if [ "$2" = "--filter" ] && [ -n "$3" ]; then
    FILTER="$3"
    echo -e "${GREEN}🔍 Filtering items by: $FILTER${NC}"
    
    FILTERED_ITEMS=$(echo "$RESPONSE" | jq "[.[] | select($FILTER)]")
    FILTERED_COUNT=$(echo "$FILTERED_ITEMS" | jq '. | length')
    
    echo -e "${GREEN}✅ Found $FILTERED_COUNT items matching filter${NC}"
    
    FILTERED_FILE="filtered_items_$(date +%Y%m%d_%H%M%S).json"
    echo "$FILTERED_ITEMS" > "$FILTERED_FILE"
    echo -e "${GREEN}💾 Filtered items saved to: $FILTERED_FILE${NC}"
fi

echo -e "${GREEN}🎉 Dataset fetch completed successfully!${NC}"
echo -e "${GREEN}🔗 View dataset: https://console.apify.com/datasets/$DATASET_ID${NC}"

# Usage examples
echo -e "${BLUE}💡 Usage examples:${NC}"
echo -e "${BLUE}  $0                                    # Use last dataset ID${NC}"
echo -e "${BLUE}  $0 <DATASET_ID>                      # Use specific dataset ID${NC}"
echo -e "${BLUE}  $0 <DATASET_ID> --pretty             # Save pretty formatted JSON${NC}"
echo -e "${BLUE}  $0 <DATASET_ID> --filter '.budget'   # Filter items with budget field${NC}"
