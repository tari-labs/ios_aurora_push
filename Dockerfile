FROM node:22-alpine

RUN apk add --no-cache tini
WORKDIR /home/node/app
COPY ./package*.json ./

RUN npm install
COPY . .
USER "node"
EXPOSE 3000

ENTRYPOINT ["tini", "--", "node", "./bin/www"]
