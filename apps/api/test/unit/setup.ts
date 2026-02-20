import { APPLICATION_STAGES, AWS_REGIONS } from '@gatherle/commons';

const setup = async () => {
  console.log('\nSetting up unit tests...');

  process.env.AWS_REGION = AWS_REGIONS.DUB;
  process.env.STAGE = APPLICATION_STAGES.DEV;
  process.env.MONGO_DB_URL = 'mock url';
  process.env.JWT_SECRET = 'secret';

  console.log('Done setting up unit tests!');
};

export default setup;
