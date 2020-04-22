FROM node:13.8
#FROM node:13.8-slim
# slim does not have curl any more

# Used for health checking
#RUN apt-get update && apt-get install -y ca-certificates wget
#RUN apt-get update && apt-get install -y curl

WORKDIR /home/node/app
COPY ./package*.json ./
#USER "node"
RUN npm install
COPY . .
#COPY --chown=node:node . .
USER "node"
EXPOSE 3000
CMD [ "npm", "run", "start" ]
