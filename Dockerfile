FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY ["frontend/package.json", "frontend/package-lock.json", "./"]
RUN npm ci
COPY ["frontend/", "./"]
RUN npm run build

FROM node:22-bookworm-slim AS backend-deps
WORKDIR /build/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY ["backend/package.json", "backend/package-lock.json", "./"]
RUN npm ci --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV FRONTEND_DIST=/app/frontend/dist

COPY --from=backend-deps /build/backend/node_modules ./node_modules
COPY ["backend/", "./"]
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

RUN mkdir -p /app/uploads/menu

EXPOSE 3001
CMD ["npm", "start"]

