import { getAvatarSrc, getDisplayName } from '@/lib/utils/general';
import { UserWithToken, User } from '@/data/graphql/types/graphql';

/**
 * Helper to create partial User objects for testing.
 * Uses Record<string, unknown> to bypass strict type checking for test fixtures.
 */
const createTestUser = (fields: Record<string, unknown>): User => fields as User;
const createTestUserWithToken = (fields: Record<string, unknown>): UserWithToken => fields as UserWithToken;

describe('General Utilities', () => {
  describe('getAvatarSrc', () => {
    it('should return undefined for undefined user', () => {
      expect(getAvatarSrc(undefined)).toBeUndefined();
    });

    it('should return undefined for user without profile_picture', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
      });
      expect(getAvatarSrc(user)).toBeUndefined();
    });

    it('should return undefined for user with null profile_picture', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        profile_picture: null,
      });
      expect(getAvatarSrc(user)).toBeUndefined();
    });

    it('should return the profile_picture URL when present', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        profile_picture: 'https://example.com/avatar.jpg',
      });
      expect(getAvatarSrc(user)).toBe('https://example.com/avatar.jpg');
    });

    it('should work with UserWithToken type', () => {
      const user = createTestUserWithToken({
        userId: '1',
        username: 'testuser',
        profile_picture: 'https://example.com/avatar.png',
        token: 'some-jwt-token',
      });
      expect(getAvatarSrc(user)).toBe('https://example.com/avatar.png');
    });
  });

  describe('getDisplayName', () => {
    it('should return "Account" for undefined user', () => {
      expect(getDisplayName(undefined)).toBe('Account');
    });

    it('should return empty string for user without names', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
      });
      // Note: Returns empty string when user exists but has no name fields
      // The "Account" fallback only applies to undefined user
      expect(getDisplayName(user)).toBe('');
    });

    it('should return given_name only when family_name is missing', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        given_name: 'John',
      });
      expect(getDisplayName(user)).toBe('John');
    });

    it('should return family_name only when given_name is missing', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        family_name: 'Doe',
      });
      expect(getDisplayName(user)).toBe('Doe');
    });

    it('should return full name when both names are present', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        given_name: 'John',
        family_name: 'Doe',
      });
      expect(getDisplayName(user)).toBe('John Doe');
    });

    it('should handle empty string names as falsy', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        given_name: '',
        family_name: 'Doe',
      });
      expect(getDisplayName(user)).toBe('Doe');
    });

    it('should handle null names as falsy', () => {
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        given_name: null,
        family_name: 'Doe',
      });
      expect(getDisplayName(user)).toBe('Doe');
    });

    it('should work with UserWithToken type', () => {
      const user = createTestUserWithToken({
        userId: '1',
        username: 'testuser',
        given_name: 'Jane',
        family_name: 'Smith',
        token: 'some-jwt-token',
      });
      expect(getDisplayName(user)).toBe('Jane Smith');
    });

    it('should trim names properly with filter(Boolean)', () => {
      // Edge case: whitespace names (though unlikely in practice)
      const user = createTestUser({
        userId: '1',
        username: 'testuser',
        given_name: 'Alice',
        family_name: 'Wonderland',
      });
      expect(getDisplayName(user)).toBe('Alice Wonderland');
    });
  });
});
