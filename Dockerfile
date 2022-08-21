FROM node:16

ENV API_HOST_URL wss://api.test.mucklet.com
ENV API_WEB_RESOURCE_PATH https://api.test.mucklet.com/api/
ENV API_ORIGIN https://test.mucklet.com
ENV LOGIN_USER changeme
ENV LOGIN_PASS changeme
ENV LOGIN_HASH changeme
ENV BOT_CONTROLLER_INCLUDE_CHARS `[ 'changeme ' ]`
ENV PERSONALITY_TYPE_SPEED 8000
ENV PERSONALITY_READ_SPEED 50000
ENV ACTION_WAKEUP_PROBABILITY 50
ENV REACTION_ARRIVE_WELCOME_POPULATION_CHANCE {1:1,}
ENV REACTION_ARRIVE_WELCOME_PRIORITY 150
ENV REACTION_ARRIVE_WELCOME_DELAY 1000
ENV REACTION_ARRIVE_WELCOME_PHRASES `["turns to {name}, \"Welcome.\". ((To get help, address me and say \"Help\".))",]`
ENV REACTION_APARTMENT_REQUEST_DEST changeme
ENV REACTION_APARTMENT_REQUEST_DESC "An empty apartment. You can change the description here with the pencil in the upper left corner of this sidebar. You can create new rooms off of this room by clicking the pencil next to the `Exit` label below."
ENV REACTION_APARTMENT_REQUEST_ISBUILDER false
ENV REACTION_APARTMENT_REQUEST_PATH "\`go out\`"

# Create app directory
WORKDIR /app

COPY . .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# EXPOSE 8080 # I don't think I need this
CMD node index.js --api.hostUrl=${API_HOST_URL} --api.webResourcePath=${API_WEB_RESOURCE_PATH} --api.origin=${API_ORIGIN} --login.user=${LOGIN_USER} --login.pass="${LOGIN_PASS}" --login.hash="${LOGIN_HASH}" --botController.includeChars=${BOT_CONTROLLER_INCLUDE_CHARS} --personality.typeSpeed=${PERSONALITY_TYPE_SPEED} --personality.readSpeed=${PERSONALITY_READ_SPEED} --actionWakeup.probability=${ACTION_WAKEUP_PROBABILITY} --reactionArriveWelcome.populationChance="${REACTION_ARRIVE_WELCOME_POPULATION_CHANCE}" --reactionArriveWelcome.priority=${REACTION_ARRIVE_WELCOME_PRIORITY} --reactionArriveWelcome.delay=${REACTION_ARRIVE_WELCOME_DELAY} --reactionArriveWelcome.phrases="${REACTION_ARRIVE_WELCOME_PHRASES}" --reactionApartmentRequest.dest="${REACTION_APARTMENT_REQUEST_DEST}" --reactionApartmentRequest.desc="${REACTION_APARTMENT_REQUEST_DESC}" --reactionApartmentRequest.isBuilder=${REACTION_APARTMENT_REQUEST_ISBUILDER} --reactionApartmentRequest.path="${REACTION_APARTMENT_REQUEST_PATH}"