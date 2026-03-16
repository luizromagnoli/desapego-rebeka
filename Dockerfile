FROM node:20-slim

WORKDIR /app

COPY .npmrc package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
