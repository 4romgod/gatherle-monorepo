# Ntlango AWS Infrastructure with CDK

This CDK project contains Ntlango infrastructure, for both the frontend and the API.

The API will be hosted as a Fargate service.

The Frontend will be hosted in ???

## Ntlango API Deployment
To deploy the infrastructure for the backend, follow these steps:

### Manually Create the ECR Repository
1. Create an ECR repository and Copy the URI
2. Create a docker image of the `ntlango-api`
    - Pull the `ntlango-api` GitHub repository
    - Create a docker image of `ntlango-api` and tag it with the URI from step 1
3. Push the image to the ECR repository
    - [Use this link](https://jhooq.com/docker-push-image-to-ecr/)

### Manually Create the Route53 Hosted Zone
1. Go to Route53 and create a hosted zone for your domain
2. Copy the authoritative nameserver (SOA), and tell our DNS provider to delegate requests to our Hosted Zone in AWS.

### Deploying the CDK Resources
1. Deploy the CDK resources

## Useful commands

 * `npm run build`   installs node_modules, and compile typescript to js
 * `npm run clean`   removes all build outputs, and node_modules
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
