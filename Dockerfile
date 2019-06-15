FROM node:10-alpine

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN npm install

COPY gaucho.js /app/gaucho
RUN chmod +x /app/gaucho

ENTRYPOINT ["/app/gaucho"]
