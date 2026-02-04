FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Force cache bust via echo
RUN echo "bust-1707012345"
COPY src ./src
COPY public ./public

# Create db directory
RUN mkdir -p db

# Expose port (Railway will set PORT env var)
EXPOSE 8080

# Start server
CMD ["node", "src/server.js"]
