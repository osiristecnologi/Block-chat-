FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads

# Render usa a PORT que ele define
ENV PORT=3000
EXPOSE 3000

# Usa node direto ao invés de npm pra pegar SIGTERM
CMD ["node", "dist/server.js"]
