import * as DAO from '@/mongodb/dao';
import {
  ChatMessageDAO,
  EventCategoryDAO,
  EventOccurrenceDAO,
  EventSeriesDAO,
  UserDAO,
  WebSocketConnectionDAO,
} from '@/mongodb/dao';

describe('Index Exports', () => {
  it('should export EventSeriesDAO', () => {
    expect(DAO.EventSeriesDAO).toBeDefined();
    expect(new DAO.EventSeriesDAO()).toBeInstanceOf(EventSeriesDAO);
  });

  it('should export UserDAO', () => {
    expect(DAO.UserDAO).toBeDefined();
    expect(new DAO.UserDAO()).toBeInstanceOf(UserDAO);
  });

  it('should export EventCategoryDAO', () => {
    expect(DAO.EventCategoryDAO).toBeDefined();
    expect(new DAO.EventCategoryDAO()).toBeInstanceOf(EventCategoryDAO);
  });

  it('should export EventOccurrenceDAO', () => {
    expect(DAO.EventOccurrenceDAO).toBeDefined();
    expect(new DAO.EventOccurrenceDAO()).toBeInstanceOf(EventOccurrenceDAO);
  });

  it('should export ChatMessageDAO', () => {
    expect(DAO.ChatMessageDAO).toBeDefined();
    expect(new DAO.ChatMessageDAO()).toBeInstanceOf(ChatMessageDAO);
  });

  it('should export WebSocketConnectionDAO', () => {
    expect(DAO.WebSocketConnectionDAO).toBeDefined();
    expect(new DAO.WebSocketConnectionDAO()).toBeInstanceOf(WebSocketConnectionDAO);
  });
});
