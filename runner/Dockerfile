FROM node:22-alpine

RUN apk add --no-cache build-base coreutils

RUN adduser -D runner
USER runner

WORKDIR /app

COPY runner/package.json runner/package-lock.json ./
RUN npm ci --omit=dev

COPY runner ./

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "index.js"]
