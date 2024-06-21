# Select the base docker image
FROM node:latest

# Copy app files to working directory
RUN mkdir -p /app
WORKDIR /app
COPY . /app

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --quiet
RUN npm install pm2 bun -g --quiet

# Build the code
RUN npm run build

# Show current folder structure in logs
RUN ls -al -R

EXPOSE 9000

CMD ["pm2-runtime", "start", "pm2.json"]
