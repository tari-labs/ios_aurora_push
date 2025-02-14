FROM node:22-slim

RUN apt-get update \
    && apt-get install -y tini ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /home/node/app
COPY ./package*.json ./

RUN npm ci
COPY . .
USER "node"
EXPOSE 3000

ENTRYPOINT ["tini", "--", "node", "--require=./instrument.js", "./bin/www"]
