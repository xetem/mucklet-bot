FROM node:16

ARG CONFIG=cfg/config.mucklet.js

# Create app directory
WORKDIR /app

COPY . .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# EXPOSE 8080 # I don't think I need this
CMD node index.js $CONFIG