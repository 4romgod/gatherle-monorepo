export const APP_NAME = 'Ntlango';

export const API_PORT = 8000;

export const API_CONTAINER_NAME = `${APP_NAME}ApiEcrContainer`;

export const DOMAIN_NAME = 'ntlango.com';

export const GITHUB = {
    owner: '4romgod',
    repoNameUI: 'ntlango-web',
    repoNameAPI: 'ntlango-api',
    repoNameCDK: 'ntlango-cdk',
    repoNameClient: 'ntlango-client',
    accessToken: `${process.env.GITHUB_ACCESS_TOKEN}`,
    defaultBranch: 'master',
};

export const API_ENDPOINTS = {
    healthcheck: '/api/v1/healthcheck',
};
