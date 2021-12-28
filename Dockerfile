FROM node:16

# Create app directory
WORKDIR /app

COPY . .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production
EXPOSE 8080
#you can change the username as per your preference
CMD node index.js --login.user=rishi cfg/config.mucklet.js