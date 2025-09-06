#!/bin/bash

# Upwork Automation - Trigger Submit Actor
# This script starts the Apify submitter actor with job data and proposal

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Triggering Upwork Submit Actor...${NC}"

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
    "APIFY_SUBMIT_ACTOR_ID"
    "UPWORK_SESSION_COOKIE"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: Required environment variable $var is not set!${NC}"
        echo -e "${YELLOW}Please set $var in your .env file.${NC}"
        exit 1
    fi
done

# Get parameters from command line arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}❌ Error: Missing required arguments!${NC}"
    echo -e "${YELLOW}Usage: $0 <JOB_URL> <PROPOSAL_TEXT> [HOURLY_RATE]${NC}"
    echo -e "${YELLOW}Example: $0 'https://www.upwork.com/jobs/~test123/' 'I am interested in this project...' 50${NC}"
    exit 1
fi

JOB_URL="$1"
PROPOSAL_TEXT="$2"
HOURLY_RATE="${3:-40}"  # Default to 40 if not provided

# Validate job URL
if [[ ! "$JOB_URL" =~ ^https://www\.upwork\.com/jobs/ ]]; then
    echo -e "${RED}❌ Error: Invalid Upwork job URL!${NC}"
    echo -e "${YELLOW}URL must start with: https://www.upwork.com/jobs/${NC}"
    exit 1
fi

# Validate hourly rate
if ! [[ "$HOURLY_RATE" =~ ^[0-9]+$ ]] || [ "$HOURLY_RATE" -lt 1 ] || [ "$HOURLY_RATE" -gt 1000 ]; then
    echo -e "${RED}❌ Error: Invalid hourly rate!${NC}"
    echo -e "${YELLOW}Hourly rate must be a number between 1 and 1000${NC}"
    exit 1
fi

echo -e "${GREEN}📋 Job URL: $JOB_URL${NC}"
echo -e "${GREEN}📝 Proposal length: ${#PROPOSAL_TEXT} characters${NC}"
echo -e "${GREEN}💰 Hourly rate: $HOURLY_RATE${NC}"

# Create payload
PAYLOAD=$(cat << EOF
{
  "sessionCookie": "$UPWORK_SESSION_COOKIE",
  "jobUrl": "$JOB_URL",
  "proposalText": "$PROPOSAL_TEXT",
  "hourlyRate": $HOURLY_RATE,
  "connectsConfirm": true,
  "maxRetries": 3,
  "delayBetweenActions": 2000,
  "headless": true,
  "takeScreenshot": true
}
EOF
)

# Validate JSON payload
if ! echo "$PAYLOAD" | jq empty 2>/dev/null; then
    echo -e "${RED}❌ Error: Failed to create valid JSON payload!${NC}"
    exit 1
fi

echo -e "${GREEN}🔑 Using token: ${APIFY_TOKEN:0:10}...${NC}"
echo -e "${GREEN}📋 Using actor ID: $APIFY_SUBMIT_ACTOR_ID${NC}"

# Start the submitter actor
echo -e "${GREEN}🚀 Starting submitter actor...${NC}"

RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $APIFY_TOKEN" \
    -d "$PAYLOAD" \
    "https://api.apify.com/v2/acts/$APIFY_SUBMIT_ACTOR_ID/runs")

# Check if the request was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Failed to start submitter actor!${NC}"
    exit 1
fi

# Extract run ID from response
RUN_ID=$(echo "$RESPONSE" | jq -r '.data.id // empty')

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
    echo -e "${RED}❌ Error: Failed to get run ID from response!${NC}"
    echo -e "${RED}Response: $RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Submitter actor started successfully!${NC}"
echo -e "${GREEN}📊 Run ID: $RUN_ID${NC}"
echo -e "${GREEN}🔗 Monitor at: https://console.apify.com/actors/$APIFY_SUBMIT_ACTOR_ID/runs/$RUN_ID${NC}"

# Save run ID for later use
echo "$RUN_ID" > last_submit_run_id.txt
echo -e "${GREEN}💾 Run ID saved to last_submit_run_id.txt${NC}"

# Wait for completion (optional)
echo -e "${YELLOW}⏳ Waiting for submission to complete...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop waiting and check manually.${NC}"

while true; do
    STATUS=$(curl -s -H "Authorization: Bearer $APIFY_TOKEN" \
        "https://api.apify.com/v2/acts/$APIFY_SUBMIT_ACTOR_ID/runs/$RUN_ID" | \
        jq -r '.data.status // empty')
    
    case "$STATUS" in
        "SUCCEEDED")
            echo -e "${GREEN}✅ Submission completed successfully!${NC}"
            break
            ;;
        "FAILED"|"ABORTED"|"TIMED-OUT")
            echo -e "${RED}❌ Submission failed with status: $STATUS${NC}"
            
            # Get error details
            ERROR_DETAILS=$(curl -s -H "Authorization: Bearer $APIFY_TOKEN" \
                "https://api.apify.com/v2/acts/$APIFY_SUBMIT_ACTOR_ID/runs/$RUN_ID" | \
                jq -r '.data.statusMessage // "No error details available"')
            
            echo -e "${RED}Error details: $ERROR_DETAILS${NC}"
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

# Get results
echo -e "${GREEN}📊 Fetching submission results...${NC}"

RESULTS=$(curl -s -H "Authorization: Bearer $APIFY_TOKEN" \
    "https://api.apify.com/v2/acts/$APIFY_SUBMIT_ACTOR_ID/runs/$RUN_ID/dataset/items?clean=true&format=json")

# Check if results are available
if [ -n "$RESULTS" ] && [ "$RESULTS" != "null" ] && [ "$RESULTS" != "[]" ]; then
    echo -e "${GREEN}✅ Results retrieved successfully!${NC}"
    
    # Save results to file
    RESULTS_FILE="submit_results_$(date +%Y%m%d_%H%M%S).json"
    echo "$RESULTS" > "$RESULTS_FILE"
    echo -e "${GREEN}💾 Results saved to: $RESULTS_FILE${NC}"
    
    # Display results summary
    STATUS=$(echo "$RESULTS" | jq -r '.[0].status // "unknown"')
    FINAL_URL=$(echo "$RESULTS" | jq -r '.[0].finalUrl // "N/A"')
    ERROR=$(echo "$RESULTS" | jq -r '.[0].error // "N/A"')
    
    echo -e "${BLUE}📋 Submission Results:${NC}"
    echo -e "${BLUE}├─ Status: $STATUS${NC}"
    echo -e "${BLUE}├─ Final URL: $FINAL_URL${NC}"
    echo -e "${BLUE}└─ Error: $ERROR${NC}"
    
    if [ "$STATUS" = "success" ]; then
        echo -e "${GREEN}🎉 Proposal submitted successfully!${NC}"
    else
        echo -e "${RED}❌ Submission failed: $ERROR${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  No results available yet${NC}"
fi

echo -e "${GREEN}🎉 Submit trigger completed!${NC}"
echo -e "${GREEN}🔗 View run: https://console.apify.com/actors/$APIFY_SUBMIT_ACTOR_ID/runs/$RUN_ID${NC}"

# Usage examples
echo -e "${BLUE}💡 Usage examples:${NC}"
echo -e "${BLUE}  $0 'https://www.upwork.com/jobs/~test123/' 'I am interested in this project...'${NC}"
echo -e "${BLUE}  $0 'https://www.upwork.com/jobs/~test123/' 'I am interested in this project...' 50${NC}"
