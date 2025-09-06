#!/bin/bash

# Upwork Automation - Run Scraper Once
# This script starts the Apify scraper with input from input.json

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Upwork Scraper...${NC}"

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
    "APIFY_USERNAME"
    "UPWORK_SESSION_COOKIE"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: Required environment variable $var is not set!${NC}"
        echo -e "${YELLOW}Please set $var in your .env file.${NC}"
        exit 1
    fi
done

# Check if input.json exists
if [ ! -f "input.json" ]; then
    echo -e "${RED}❌ Error: input.json file not found!${NC}"
    echo -e "${YELLOW}Creating example input.json...${NC}"
    
    cat > input.json << 'EOF'
{
  "searches": [
    "https://www.upwork.com/nx/search/jobs/?q=devops&sort=recency",
    "https://www.upwork.com/nx/search/jobs/?q=n8n&sort=recency"
  ],
  "sessionCookie": "your_upwork_session_cookie_here",
  "maxPagesPerSearch": 3,
  "fetchDetails": true
}
EOF
    
    echo -e "${YELLOW}Please edit input.json with your actual search URLs and session cookie.${NC}"
    exit 1
fi

# Validate input.json
if ! jq empty input.json 2>/dev/null; then
    echo -e "${RED}❌ Error: input.json is not valid JSON!${NC}"
    exit 1
fi

# Get actor ID (assuming it follows the pattern: username~apify-scraper)
ACTOR_ID="${APIFY_USERNAME}~apify-scraper"

echo -e "${GREEN}📋 Using actor ID: $ACTOR_ID${NC}"
echo -e "${GREEN}🔑 Using token: ${APIFY_TOKEN:0:10}...${NC}"

# Start the scraper
echo -e "${GREEN}🚀 Starting scraper run...${NC}"

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $APIFY_TOKEN" \
    -d @input.json \
    "https://api.apify.com/v2/acts/$ACTOR_ID/runs")

# Check if the request was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to start scraper!${NC}"
    exit 1
fi

# Extract run ID from response
RUN_ID=$(echo "$RESPONSE" | jq -r '.data.id // empty')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
    echo -e "${RED}❌ Error: Failed to get run ID from response!${NC}"
    echo -e "${RED}Response: $RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Scraper started successfully!${NC}"
echo -e "${GREEN}📊 Run ID: $RUN_ID${NC}"
echo -e "${GREEN}🔗 Monitor at: https://console.apify.com/actors/$ACTOR_ID/runs/$RUN_ID${NC}"

# Save run ID for later use
echo "$RUN_ID" > last_run_id.txt
echo -e "${GREEN}💾 Run ID saved to last_run_id.txt${NC}"

# Wait for completion (optional)
echo -e "${YELLOW}⏳ Waiting for scraper to complete...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop waiting and check manually.${NC}"

while true; do
    STATUS=$(curl -s -H "Authorization: Bearer $APIFY_TOKEN" \
        "https://api.apify.com/v2/acts/$ACTOR_ID/runs/$RUN_ID" | \
        jq -r '.data.status // empty')
    
    case "$STATUS" in
        "SUCCEEDED")
            echo -e "${GREEN}✅ Scraper completed successfully!${NC}"
            break
            ;;
        "FAILED"|"ABORTED"|"TIMED-OUT")
            echo -e "${RED}❌ Scraper failed with status: $STATUS${NC}"
            exit 1
            ;;
        "RUNNING"|"READY")
            echo -e "${YELLOW}⏳ Status: $STATUS - Still running...${NC}"
            sleep 10
            ;;
        *)
            echo -e "${YELLOW}⏳ Status: $STATUS - Waiting...${NC}"
            sleep 10
            ;;
    esac
done

# Get dataset ID
DATASET_ID=$(curl -s -H "Authorization: Bearer $APIFY_TOKEN" \
    "https://api.apify.com/v2/acts/$ACTOR_ID/runs/$RUN_ID" | \
    jq -r '.data.defaultDatasetId // empty')

if [ -n "$DATASET_ID" ] && [ "$DATASET_ID" != "null" ]; then
    echo -e "${GREEN}📊 Dataset ID: $DATASET_ID${NC}"
    echo "$DATASET_ID" > last_dataset_id.txt
    echo -e "${GREEN}💾 Dataset ID saved to last_dataset_id.txt${NC}"
    
    # Get item count
    ITEM_COUNT=$(curl -s -H "Authorization: Bearer $APIFY_TOKEN" \
        "https://api.apify.com/v2/datasets/$DATASET_ID/items?clean=true&format=json" | \
        jq '. | length')
    
    echo -e "${GREEN}📈 Found $ITEM_COUNT job listings${NC}"
else
    echo -e "${RED}❌ Error: Could not get dataset ID!${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 Scraper run completed successfully!${NC}"
echo -e "${GREEN}📊 Results: $ITEM_COUNT jobs found${NC}"
echo -e "${GREEN}🔗 View results: https://console.apify.com/datasets/$DATASET_ID${NC}"
