FROM ghcr.io/puppeteer/puppeteer:24.8.2

# Use root user to install fonts
USER root

# Install fonts for better Chinese and English text rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
  fonts-noto-cjk \
  fonts-noto-color-emoji \
  fonts-noto-core \
  fonts-dejavu-core \
  fonts-liberation \
  fonts-wqy-zenhei \
  fonts-wqy-microhei \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Switch back to non-root user for security best practices
# https://github.com/puppeteer/puppeteer/blob/efc1343e24247225428e0602471c57396ac31857/docker/Dockerfile#L7
# UID of the non-root user 'pptruser'
USER 10042

WORKDIR /app

COPY . .
RUN npm install

CMD ["node", "index.js"]
