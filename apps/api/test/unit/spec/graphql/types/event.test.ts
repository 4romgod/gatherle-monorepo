import 'reflect-metadata';
import { Media, Event, CreateEventInput, UpdateEventInput, RsvpInput, CancelRsvpInput } from '@gatherle/commons/types';
import { EventPrivacySetting, EventStatus } from '@gatherle/commons/types/event';

describe('Enums', () => {
  it('should ensure that EventPrivacySetting enum have the correct values', () => {
    expect(EventPrivacySetting.Public).toBe('Public');
    expect(EventPrivacySetting.Private).toBe('Private');
    expect(EventPrivacySetting.Invitation).toBe('Invitation');
  });

  it('should ensure that EventStatus enum have the correct values', () => {
    expect(EventStatus.Cancelled).toBe('Cancelled');
    expect(EventStatus.Completed).toBe('Completed');
    expect(EventStatus.Ongoing).toBe('Ongoing');
    expect(EventStatus.Upcoming).toBe('Upcoming');
  });
});

describe('Media ObjectType', () => {
  it('should create an empty media type object', () => {
    const media = new Media();
    expect(media.featuredImageUrl).toBeUndefined();
    expect(media.otherMediaData).toBeUndefined();
  });

  it('should add properties to empty media type object', () => {
    const media = new Media();
    media.featuredImageUrl = 'mock image URL';
    media.otherMediaData = {
      mockKey: 'MockValue',
    };
    expect(media instanceof Media).toBeTruthy();
    expect(media).toEqual({
      featuredImageUrl: 'mock image URL',
      otherMediaData: {
        mockKey: 'MockValue',
      },
    });
  });
});

describe('Event', () => {
  it('should define ObjectType correctly', () => {
    const eventType = new Event();
    expect(eventType).toBeDefined();
  });

  it('should have fields with correct decorators', () => {
    const eventType = new Event();

    expect(eventType.eventId).toBeUndefined(); // Because we are testing default values
    expect(eventType.slug).toBeUndefined();
    expect(eventType.title).toBeUndefined();
    expect(eventType.description).toBeUndefined();
    expect(eventType.recurrenceRule).toBeUndefined();
    expect(eventType.location).toBeUndefined();
    expect(eventType.status).toBeUndefined();
    expect(eventType.capacity).toBeUndefined();
    expect(eventType.eventCategories).toBeUndefined();
    expect(eventType.organizers).toBeUndefined();
    expect(eventType.tags).toBeUndefined();
    expect(eventType.media).toBeUndefined();
    expect(eventType.additionalDetails).toBeUndefined();
    expect(eventType.comments).toBeUndefined();
    expect(eventType.privacySetting).toBeUndefined();
    expect(eventType.eventLink).toBeUndefined();
  });
});

describe('CreateEventInput', () => {
  it('should define InputType correctly', () => {
    const createEventInputType = new CreateEventInput();
    expect(createEventInputType).toBeDefined();
  });

  it('should have fields with correct decorators', () => {
    const createEventInputType = new CreateEventInput();

    expect(createEventInputType.title).toBeUndefined();
    expect(createEventInputType.description).toBeUndefined();
    expect(createEventInputType.recurrenceRule).toBeUndefined();
    expect(createEventInputType.location).toBeUndefined();
    expect(createEventInputType.status).toBeUndefined();
    expect(createEventInputType.capacity).toBeUndefined();
    expect(createEventInputType.eventCategories).toBeUndefined();
    expect(createEventInputType.organizers).toBeUndefined();
    expect(createEventInputType.tags).toBeUndefined();
    expect(createEventInputType.media).toBeUndefined();
    expect(createEventInputType.additionalDetails).toBeUndefined();
    expect(createEventInputType.comments).toBeUndefined();
    expect(createEventInputType.privacySetting).toBeUndefined();
    expect(createEventInputType.eventLink).toBeUndefined();
  });
});

describe('UpdateEventInput', () => {
  it('should define InputType correctly', () => {
    const updateEventInputType = new UpdateEventInput();
    expect(updateEventInputType).toBeDefined();
  });

  it('should have fields with correct decorators', () => {
    const updateEventInputType = new UpdateEventInput();

    expect(updateEventInputType.eventId).toBeUndefined();
    expect(updateEventInputType.title).toBeUndefined();
    expect(updateEventInputType.description).toBeUndefined();
    expect(updateEventInputType.recurrenceRule).toBeUndefined();
    expect(updateEventInputType.location).toBeUndefined();
    expect(updateEventInputType.status).toBeUndefined();
    expect(updateEventInputType.capacity).toBeUndefined();
    expect(updateEventInputType.eventCategories).toBeUndefined();
    expect(updateEventInputType.organizers).toBeUndefined();
    expect(updateEventInputType.tags).toBeUndefined();
    expect(updateEventInputType.media).toBeUndefined();
    expect(updateEventInputType.additionalDetails).toBeUndefined();
    expect(updateEventInputType.comments).toBeUndefined();
    expect(updateEventInputType.privacySetting).toBeUndefined();
    expect(updateEventInputType.eventLink).toBeUndefined();
  });
});

describe('RsvpInput', () => {
  it('should define InputType correctly', () => {
    const rsvpInputType = new RsvpInput();
    expect(rsvpInputType).toBeDefined();
  });

  it('should have fields with correct decorators', () => {
    const rsvpInputType = new RsvpInput();

    expect(rsvpInputType.eventId).toBeUndefined();
    expect(rsvpInputType.userIdList).toBeUndefined();
    expect(rsvpInputType.usernameList).toBeUndefined();
    expect(rsvpInputType.emailList).toBeUndefined();
  });
});

describe('CancelRsvpInput', () => {
  it('should define InputType correctly', () => {
    const cancelRsvpInputType = new CancelRsvpInput();
    expect(cancelRsvpInputType).toBeDefined();
  });

  it('should have fields with correct decorators', () => {
    const cancelRsvpInputType = new CancelRsvpInput();

    expect(cancelRsvpInputType.eventId).toBeUndefined();
    expect(cancelRsvpInputType.userIdList).toBeUndefined();
    expect(cancelRsvpInputType.usernameList).toBeUndefined();
    expect(cancelRsvpInputType.emailList).toBeUndefined();
  });
});
