# ==========================================
# STAGE 1: Build Environment
# ==========================================
FROM node:20-alpine AS build

WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy application source and Prisma configurations
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma client and compile the TypeScript application
RUN npx prisma generate
RUN npx tsc prisma/seed.ts --target ES2021 --module commonjs --moduleResolution node --skipLibCheck
RUN npm run build

# Prune devDependencies to keep production clean
RUN npm prune --production

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy only runtime dependencies and build artifacts from Stage 1
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/prisma ./prisma

# Use non-root node user for container execution hardening
USER node

EXPOSE 3000

# Start NestJS API
CMD ["node", "dist/src/main"]
