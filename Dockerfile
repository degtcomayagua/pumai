FROM node:20-alpine

WORKDIR /app

# Native deps for node-gyp and prisma on alpine
RUN apk add --no-cache python3 make g++ openssl libc6-compat

# Copy package manifests first for better layer caching
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm install
RUN npm install --prefix server
RUN npm install --prefix client 

# Copy the rest of the source
COPY . .


# Build server
RUN npm run --prefix server build

# Build mobile app
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run --prefix client build

# Copy built client into server output
RUN mkdir -p /app/server/dist/client-dist && \
    cp -r /app/client/dist/* /app/server/dist/client-dist/

WORKDIR /app/server

# Optional fallback: regenerate Prisma on startup too
CMD ["sh", "-c", "npm run start"]
