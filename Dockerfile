FROM node:22-alpine

RUN apk add --no-cache tini
WORKDIR /home/node/app
COPY ./package*.json ./

RUN npm ci
COPY . .
USER "node"
EXPOSE 3000

ENTRYPOINT ["tini", "--", "node", "--require=./instrument.js", "./bin/www"]
