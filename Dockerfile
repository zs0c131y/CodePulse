FROM node:24-alpine AS frontend

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/* ./
RUN npm run build

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache git

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev
WORKDIR /app

COPY backend/ ./backend/

COPY --from=frontend /app/dist ./dist

EXPOSE 3000

CMD ["node", "backend/index.js"]
