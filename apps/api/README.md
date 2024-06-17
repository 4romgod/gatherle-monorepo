# Ntlango - TypeScript GraphQL Apollo Server with Express API

This repository contains a GraphQL API built with TypeScript, Apollo Server, and Express. It includes unit, integration, and canary tests located in the `test` folder.

## Getting Started

To get started with this project, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   ```

2. **Install dependencies:**

   ```bash
   cd <project-folder>
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env` file at the root of your project and define the required environment variables. Here's an example `.env` file:
   
   ```bash
   API_DOMAIN=<domain of the api>, e.g. http://localhost for development
   API_PORT=<port number>, usually use 9000
   MONGO_DB_URL=<url to your mongodb databse>
   NODE_ENV=<application environment>, i.e. dev, beta, gamma, prod
   JWT_SECRET=<secret string for JWT tokens>
   BCRYPT_SALT=<number for bcrypt salt>, e.g. 15
   ```

   Alternatively, declare the variables in your bash/zsh terminal like so:
   ```bash
   export API_DOMAIN=<domain of the api>, e.g. http://localhost for development
   export API_PORT=<port number>, usually use 9000
   export MONGO_DB_URL=<url to your mongodb databse>
   export NODE_ENV=<application environment>, i.e. dev, beta, gamma, prod
   export JWT_SECRET=<secret string for JWT tokens>
   export BCRYPT_SALT=<number for bcrypt salt>, e.g. 15
   ```

4. **Build the project:**

   ```bash
   npm run build
   ```

5. **Start the server:**

   ```bash
   npm run start
   ```

   during development, you can spin up a dev server like:

   ```bash
   npm run dev
   ```

   when developing, you might want some data to seed your database, run:

   ```bash
   npm run seed
   ```

6. **Access the GraphQL Playground:**

   Once the server is running, you can access the GraphQL Playground by navigating to `http://localhost:9000/api/v1/graphql` in your web browser.

7. **Set up Git hooks (optional):**

   To ensure unit tests run before pushing code to the remote repository, set up the Git hooks by running the following npm script:

   ```bash
   npm run install-hooks

## Project Structure

- `lib/`: Contains the source code for the GraphQL server.
   - `clients` - contains source code to instantiate clients like mongodb client that handles DB connections
   - `constants` - Self explanatory. However, we also create constants that maps to our environment variables for easier access.
   - `graphql` - contains the graphql related source code
      - `resolvers/` - GraphQL resolver functions.
      - `schema/` - GraphQL schema definition.
      - `types/` - GraphQL type definitions.
   - `mongodb/` - Codebase for fetching data from mongodb database.
      - `dao/` - Data Access Object Pattern to handle the communication with the database.
      - `mockData/` - Seed data for starting up the development server.
      - `models/` - Organization of data within the database and the links between related entities.
   - `scripts/`: Scripts for commonly used operations.
   - `utils` - contains our utility functions.
   - `validation` - we use 'zod' for input validation
   - `server.ts`: Entry point for the server.
- `test/`: Contains unit, integration, and canary tests.
   - `canary/`
   - `integration/`
   - `unit/`
- `dist/`: Contains the compiled TypeScript code (this stays on your local machine only!)
- `package.json`: Defines project dependencies and scripts.
- `tsconfig.json`: TypeScript configuration file.
- `.env`: Environment variables file.

> Let's keep this README.md file alive by adding any new features, files/folders, Thank You.

## Running Tests

To run tests for this project, you can use the following npm scripts:

- **Run unit tests:**

  ```bash
  npm test:unit
  ```

---
- **Run integration tests:**

   To run these, you will need to have all the necessary environment variables setup as explained on the [Get Started](#getting-started)

  ```bash
  npm run test:integration
  ```

---
- **Run canary tests:**

   To run these, you will need to have all the necessary environment variables setup as explained on the [Get Started](#getting-started)

  ```bash
  npm run test:canary
  ```

---
- **Run all tests**

   To run all tests, run the command
   ```
   npm run test
   ```

## Chores and Operations

These are things we do every now and then to keep this repository clean.

- **Run depchecks to check unused dependencies**

   ```bash
   npx depcheck
   ```

## Contributing

Contributions to this project are welcome! If you find any issues or have suggestions for improvements, please open an issue or submit a pull request.

## License

[MIT License](LICENSE)
