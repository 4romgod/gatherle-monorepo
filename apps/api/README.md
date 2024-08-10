# Ntlango - TypeScript GraphQL Apollo Server with Express API, and AWS CDK Infrastructure

This repository contains the following tech stack:
- TypeScript
- GraphQL
- Apollo Server
- Express
- AWS CDK for Infrastructure
- GitHub Actions for CI/CD pipeline.

It includes jest unit, integration, and canary tests located in the `test` folder.

## Getting Started

To get started with local development for this project, follow these steps:

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
   API_PORT=<port number>, you can choose any, e.g. 9000
   NODE_ENV=<application environment>, i.e. Dev, Beta, Gamma, Prod ( since we are in dev, use "Dev" )
   MONGO_DB_URL=<url to your mongodb databse >
   JWT_SECRET=<secret string for JWT tokens >
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

## Common Issues/Bugs and Their Fixes

### Issue: Incorrect Jest `moduleNameMapper` Configuration

### Symptom
When running Jest tests, you encounter errors like:
Could not locate module some modules like @/test/utils mapped as: rootDir/test/$1.

### Solution
* **Problem Description**: Jest's `moduleNameMapper` incorrectly maps paths, leading to module resolution errors.

* **Fix**: Correctly configure `moduleNameMapper` in your Jest configuration (usually `jest.config.js`) to handle path aliases.

   ```javascript
   moduleNameMapper: {
     '^@/(?!test)(.*)$': '<rootDir>/../../lib/$1',
     '^@/test/(.*)$': '<rootDir>/../../test/$1',
   }
> Explanation: Our Integration tests and Canaries are within their own ROOT directory. This means, for Jest's `moduleNameMapper`, we need to go out of the test's ROOT, and map our modules into the project's ROOT directory, hence `rootDir/../../lib/$1`


### Issue: TypeScript Path Alias Issue with JavaScript Build Output

### Symptom
After configuring TypeScript path aliases (`paths`) in `tsconfig.json`, the project fails to resolve paths correctly in the built JavaScript output. This leads to runtime errors due to module resolution failures.

### Solution
* **Problem Description**: TypeScript path aliases (`paths`) are specific configurations in `tsconfig.json` used for aliasing module imports to physical paths. However, these aliases are not recognized at runtime.

* **Workaround**: Use `tsconfig-paths/register` module to resolve TypeScript path aliases at runtime.

   - **Installation**: Install `tsconfig-paths/register`:
     ```bash
     npm install tsconfig-paths/register
     ```

   - **Usage**:

      Update your scripts to include `-r tsconfig-paths/register` flag to enable path alias resolution during runtime:

      Inside `package.json`
      ```json
      "scripts": {
        "start:ts": "ts-node lib/scripts/startServer.ts",
        "start:js": "node -r ts-node/register dist/lib/scripts/startServer.js"
      }
      ```

      Insight `tsconfig.json`

      ```json
      "ts-node": {
        "require": ["tsconfig-paths/register"]
      }
      ```

   - **Explanation**: 
     - `tsconfig-paths/register` registers TypeScript path aliases (`paths`) at runtime.
     - This allows Node.js to resolve modules correctly based on the configured paths in `tsconfig.json`.
     - For our `start:ts` script, we use `ts-node`, which is already configured inside our `tsconfig.json` file to use `tsconfig-paths/register` to register TypeScript aliases (`paths`) at runtime.

3. **Additional Notes**: 
   - Ensure that `tsconfig-paths/register` is included in your build and start scripts (`start` for development and `build` for production) to handle path aliases effectively.
   - Test the build output thoroughly to confirm that all modules are resolved correctly in the production environment.

## Backlog

### Unit Testing

Unit testing ensures that individual units or components of our code are working correctly. It's crucial for maintaining code quality and catching bugs early.

Here is a preview of our current test coverage (We removed tests that have 100% coverage).

```
-----------------------------|---------|----------|---------|---------|--------------------------------------------------------------
File                         | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                                            
-----------------------------|---------|----------|---------|---------|--------------------------------------------------------------
All files                    |   90.91 |    96.79 |   56.33 |   90.37 |                                                              
 graphql/types               |   82.25 |      100 |   15.38 |   79.92 |                                                              
  event.ts                   |   70.21 |      100 |    4.54 |   67.44 | ...3,186,189,192,195,198,201,204,207,216,220,224,233,237,241 
  query.ts                   |   84.61 |      100 |   27.27 |   81.81 | 44,47,56,65,68,78,81,84                                      
  user.ts                    |   92.85 |      100 |   28.57 |   91.66 | 52,61,96,132,145                                             
 mongodb/models              |   47.45 |        0 |      30 |   46.29 |                                                              
  event.ts                   |   66.66 |      100 |       0 |   66.66 | 112-114                                                      
  eventCategory.ts           |   66.66 |      100 |       0 |   66.66 | 17-19                                                        
  user.ts                    |   28.57 |        0 |       0 |    30.3 | 20,73-97,102,108-109,116-117                                 
-----------------------------|---------|----------|---------|---------|--------------------------------------------------------------
Test Suites: 22 passed, 22 total
Tests:       226 passed, 226 total
Snapshots:   0 total
Time:        36.683 s
```

### Integration Testing

Integration testing verifies the interaction between different parts of your application. It ensures that various components work together as expected.

* User Resolver
    * deleteUserById
    * readUserById
    * readUserByUsername
    * readUsers
    * queryUsers
* Event Resolver
    * createEvent
    * updateEvent
    * deleteEvent
    * readEventById
    * readEventBySlug
    * readEvents
* Event Category Resolver
    * createEventCategory
    * updateEventCategory
    * deleteEventCategory
    * readEventCategoryById
    * readEventCategoryBySlug
    * readEventCategories

### Canary Testing

### Load Testing
Load testing simulates real-world usage scenarios to evaluate how your system performs under varying loads.

## Authentication & Authorization
Authentication verifies users' identities, while authorization controls their access to resources.

### Authentication
Implementing secure authentication mechanisms such as JWT (JSON Web Tokens) or OAuth.

### Authorization
Setting up role-based access control (RBAC) or attribute-based access control (ABAC) to enforce permissions.

## DevOps
### Infrastructure (IaC)
Infrastructure as Code (IaC) automates the provisioning and management of infrastructure.

### CI/CD Pipeline (with different stages (beta, gamma, prod))
Setting up Continuous Integration/Continuous Deployment pipelines to automate testing and deployment across different environments.

## DNS
Managing Domain Name System (DNS) settings to associate domain names with IP addresses.

### Getting a domain name
Managing Domain Name System (DNS) settings to associate domain names with IP addresses.

### Setup the domain
Registering a domain name for your application.

## Docker Image
### optimize `npm install`
`npm install` takes about 90 seconds. This is bad!

## Graphql functionality
Enhancing your GraphQL API with advanced features and best practices.

### Take advantage of type-graphql scalars
* https://typegraphql.com/docs/scalars.html#custom-scalars

### Look into graphql ID (and other Scalars)
* https://typegraphql.com/docs/scalars.html#custom-scalars
* https://graphql.org/learn/global-object-identification

### Look into Middleware and guards
* https://typegraphql.com/docs/middlewares.html#class-based-middleware

## Other
### Look into `rrule` for Recurrence Rules
* https://github.com/jkbrzt/rrule
* https://jkbrzt.github.io/rrule
* https://www.nylas.com/blog/create-recurring-events-using-rrule-dev

### Some resources for nested filters
* https://dev.to/riyadhossain/mastering-mongodb-aggregation-framework-unraveling-the-power-of-pipelines-4oa0

### Look into Subscriptions
* https://typegraphql.com/docs/subscriptions.html#triggering-subscription-topics

### Look into custom decorators
* https://typegraphql.com/docs/custom-decorators.html

### Look into rate limitting/throttling
* https://www.npmjs.com/package/express-rate-limit

## References and Good Reads
* [type-graphql GitHub repo](https://github.com/MichalLytek/type-graphql)
