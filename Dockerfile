FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY Main ./Main
COPY tailwind.config.cjs postcss.config.cjs ./
RUN npm run tailwind:build

FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install
COPY backend/prisma ./prisma
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
COPY --from=frontend-builder /app/Main ./Main
WORKDIR /app/backend
EXPOSE 3000
CMD ["npm", "start"]
