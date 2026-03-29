FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

RUN npm install -g tsx

COPY tsconfig.json ./
COPY src/ ./src/

CMD ["tsx", "src/index.ts"]
