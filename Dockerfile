FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server/ ./server/
COPY client/ ./client/

RUN mkdir -p logs

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
