FROM apify/actor-node-puppeteer-chrome:20-3.1.10

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY . ./

# Set environment variables
ENV APIFY_STORAGE_DIR=/apify_storage

# Run the actor
CMD ["node", "submit.js"]