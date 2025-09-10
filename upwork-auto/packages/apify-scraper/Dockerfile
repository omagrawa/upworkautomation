FROM apify/actor-node-puppeteer-chrome:20

# Use a writable workdir for myuser
USER root
RUN mkdir -p /home/myuser/app && chown -R myuser:myuser /home/myuser/app
USER myuser
WORKDIR /home/myuser/app

# Copy only package metadata first
COPY package*.json ./

# Keep npm quiet, avoid workspace auto-detect, skip Chromium download
ENV NPM_CONFIG_WORKSPACES=false
ENV NPM_CONFIG_LOGLEVEL=warn
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome

# Install deps (use ci if lockfile exists, else install)
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev ; \
    else \
      npm install --omit=dev ; \
    fi

# Copy the rest
COPY . .

# Run the actor (no xvfb needed on this image)
CMD ["node", "main.js"]
