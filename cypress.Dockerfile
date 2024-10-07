# BASE IMAGE
FROM cypress/included:12.9.0

# CREATE REPOSITORY ARCHITECTURE
# RUN mkdir /cypressImages
# WORKDIR /cypressImages

# COPY REQUIRED FILES
COPY . .

# INSTALL BASE DEPENDENCIES
RUN npm i -g npm@latest
RUN npm i --legacy-peer-deps
RUN npm i -g --force

# RUN TESTS
CMD npx cypress run