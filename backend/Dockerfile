FROM node:20-alpine
WORKDIR /app

# Install OpenSSL required by Prisma query engine on Alpine Linux
RUN apk add --no-cache openssl

# Install production dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate client binaries
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the backend application
COPY . .

# Ensure entrypoint script is executable
RUN chmod +x /app/docker-entrypoint.sh

# Default container listening port (80) matching host binding 127.0.0.1:${BACKEND_PORT:-8092}:80
ENV PORT=80
EXPOSE 80

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["npm", "start"]
