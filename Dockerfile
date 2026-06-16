# Single-image build + run so the native sqlite3 binary matches the runtime glibc.
FROM node:20-bookworm-slim

WORKDIR /app

# Build tools for compiling native modules (sqlite3) from source against this image's glibc.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies, rebuilding sqlite3 from source for this exact environment.
COPY package*.json ./
RUN npm_config_build_from_source=true npm ci

# Copy the rest of the source.
COPY . .

# VITE_CLERK_PUBLISHABLE_KEY is baked into the frontend at build time.
# Railway passes service variables as build args; expose it to the build.
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build

ENV NODE_ENV=production
CMD ["node", "dist/server.cjs"]
