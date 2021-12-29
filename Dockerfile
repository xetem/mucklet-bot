FROM node:16

ENV API_HOST_URL wss://test.mucklet.com
ENV API_WEB_RESOURCE_PATH https://test.mucklet.com/api/
ENV API_ORIGIN https://mucklet.com
ENV LOGIN_USER botmaster
ENV LOGIN_PASS ZSx9xofZjJiJME7S5AjHS2EehqQMqlHEtD8d1ZE8XNA=
ENV BOT_CONTROLLER_INCLUDE_CHARS `[ 'c62rjs0t874cqited7b0' ]`
ENV PERSONALITY_TYPE_SPEED 8000
ENV PERSONALITY_READ_SPEED 50000
ENV ACTION_WAKEUP_PROBABILITY 50
ENV REACTION_ARRIVE_WELCOME_POPULATION_CHANCE {1:1,}
ENV REACTION_ARRIVE_WELCOME_PRIORITY 150
ENV REACTION_ARRIVE_WELCOME_DELAY 1000
ENV REACTION_ARRIVE_WELCOME_PHRASES `["turns to {name}, \"Welcome.\". ((To get help, address me and say \"Help\".))",]`
ENV REACTION_WHISPER_REPLY_CHANCE 1
ENV REACTION_WHISPER_REPLY_PRIORITY 100
ENV REACTION_WHISPER_REPLY_DELAY 1000
ENV REACTION_WHISPER_REPLY_PHRASES `[":does not understand whispers. ((To get help, address me and say \"Help\".))",]`

# Create app directory
WORKDIR /app

COPY . .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# EXPOSE 8080 # I don't think I need this
CMD node index.js --api.hostUrl=${API_HOST_URL} --api.webResourcePath=${API_WEB_RESOURCE_PATH} --api.origin=${API_ORIGIN} --login.user=${LOGIN_USER} --login.pass="${LOGIN_PASS}" --botController.includeChars="${BOT_CONTROLLER_INCLUDE_CHARS}" --personality.typeSpeed=${PERSONALITY_TYPE_SPEED} --personality.readSpeed=${PERSONALITY_READ_SPEED} --actionWakeup.probability=${ACTION_WAKEUP_PROBABILITY} --reactionArriveWelcome.populationChance="${REACTION_ARRIVE_WELCOME_POPULATION_CHANCE}" --reactionArriveWelcome.priority=${REACTION_ARRIVE_WELCOME_PRIORITY} --reactionArriveWelcome.delay=${REACTION_ARRIVE_WELCOME_DELAY} --reactionArriveWelcome.phrases="${REACTION_ARRIVE_WELCOME_PHRASES}" --reactionWhisperReply.chance=${REACTION_WHISPER_REPLY_CHANCE} --reactionWhisperReply.priority=${REACTION_WHISPER_REPLY_PRIORITY} --reactionWhisperReply.delay=${REACTION_WHISPER_REPLY_DELAY} --reactionWhisperReply.phrases="${REACTION_WHISPER_REPLY_PHRASES}"