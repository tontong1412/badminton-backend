FROM node:22-alpine AS base

# Backend build dependencies
FROM base AS deps
WORKDIR /deps
COPY ./package*.json ./
RUN npm install

# Build backend
FROM base AS builder
WORKDIR /build
COPY --from=deps /deps/node_modules ./node_modules
COPY . .
RUN npm run build

# Install runtime dependencies and copy builds from the previous stage
FROM base AS prod
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
WORKDIR /app
COPY ./package*.json ./
RUN npm install --omit=dev
COPY --from=builder ./build/build ./build/
CMD ["npm", "start"]
