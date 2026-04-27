import * as Models from '@/mongodb/models';

describe('Models Index Exports', () => {
  it('should export EventSeries model', () => {
    expect(Models.EventSeries).toBeDefined();
  });

  it('should export User model', () => {
    expect(Models.User).toBeDefined();
  });

  it('should export EventCategory model', () => {
    expect(Models.EventCategory).toBeDefined();
  });

  it('should export EventSeriesParticipant model', () => {
    expect(Models.EventSeriesParticipant).toBeDefined();
  });

  it('should export EventOccurrence model', () => {
    expect(Models.EventOccurrence).toBeDefined();
  });

  it('should export ChatMessage model', () => {
    expect(Models.ChatMessage).toBeDefined();
  });

  it('should export WebSocketConnection model', () => {
    expect(Models.WebSocketConnection).toBeDefined();
  });
});
