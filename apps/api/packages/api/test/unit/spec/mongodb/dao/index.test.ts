import * as DAO from '@/mongodb/dao';
import {EventCategoryDAO, EventDAO, UserDAO} from '@/mongodb/dao';

describe('Index Exports', () => {
  it('should export EventDAO', () => {
    expect(DAO.EventDAO).toBeDefined();
    expect(new DAO.EventDAO()).toBeInstanceOf(EventDAO);
  });

  it('should export UserDAO', () => {
    expect(DAO.UserDAO).toBeDefined();
    expect(new DAO.UserDAO()).toBeInstanceOf(UserDAO);
  });

  it('should export EventCategoryDAO', () => {
    expect(DAO.EventCategoryDAO).toBeDefined();
    expect(new DAO.EventCategoryDAO()).toBeInstanceOf(EventCategoryDAO);
  });
});
