FROM node:20 AS frontend

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci 

COPY backend/ ./

COPY --from=frontend /app/dist ./dist

EXPOSE 3000

CMD ["node", "index.js"]
