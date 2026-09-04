# --- 建置前端 ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- 執行:Express 同時提供 API 與前端靜態檔 ---
FROM node:24-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN npm ci --prefix server --omit=dev
COPY server ./server
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/german-learn.db
EXPOSE 8080
CMD ["node", "server/index.js"]
