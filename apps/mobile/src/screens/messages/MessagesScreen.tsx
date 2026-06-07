import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HeaderIconButton } from '@/app/navigation/HeaderIconButton';
import { MainTabScreenLayout } from '@/app/navigation/MainTabScreenLayout';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { RemoteImage } from '@/components/core/RemoteImage';
import { ScreenErrorState } from '@/components/core/ScreenErrorState';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { SwipeableConversationRow } from '@/components/messages/SwipeableConversationRow';
import { ConversationRowSkeleton } from '@/components/skeleton/ConversationRowSkeleton';
import { usePullToRefresh } from '@/hooks/core/usePullToRefresh';
import { useSessionExpiryRedirect } from '@/hooks/core/useSessionExpiryRedirect';
import { useChatRealtime } from '@/hooks/messages/useChatRealtime';
import { useMessages } from '@/hooks/messages/useMessages';
import { useUserSearch } from '@/hooks/search/useUserSearch';
import { getDisplayName, getInitials } from '@/lib/events/formatters';
import { useAppTheme } from '@/app/theme/AppThemeProvider';
import { fontSize, typography } from '@/app/theme/typography';

export function MessagesScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, isAuthenticated } = useAppShell();
  const { theme } = useAppTheme();
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, error, loading, markConversationRead, markConversationUnread, refetch } = useMessages(
    authToken,
    isAuthenticated,
  );
  const {
    clear: clearUserSearch,
    loading: userSearchLoading,
    results: userSearchResults,
    search: searchUsers,
  } = useUserSearch(authToken);
  const { onRefresh, refreshing } = usePullToRefresh(
    useCallback(async () => {
      await refetch();
    }, [refetch]),
  );

  useChatRealtime({
    enabled: isAuthenticated,
    onChatConversationUpdated: () => {
      void refetch();
    },
  });
  const failureKind = useSessionExpiryRedirect({
    error,
    redirectTab: 'Messages',
  });

  const filteredConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const haystack = [
        conversation.conversationWithUser?.username,
        conversation.conversationWithUser?.given_name,
        conversation.conversationWithUser?.family_name,
        conversation.lastMessage.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [conversations, searchQuery]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      searchUsers(text);
    },
    [searchUsers],
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
    clearUserSearch();
  }, [clearUserSearch]);
  const handleCloseSearch = useCallback(() => {
    handleClear();
    setSearchActive(false);
  }, [handleClear]);
  const canSearchMessages = isAuthenticated && Boolean(authToken);
  const messagesToolbarProps = !canSearchMessages
    ? {
        center: <Text style={[styles.toolbarTitle, { color: theme.colors.textPrimary }]}>Messages</Text>,
        right: null,
      }
    : searchActive
      ? {
          center: (
            <SearchField
              autoFocus
              onChangeText={handleSearchChange}
              onClear={handleClear}
              placeholder="Search conversations"
              value={searchQuery}
            />
          ),
          right: <HeaderIconButton accessibilityLabel="Close search" icon="x" onPress={handleCloseSearch} />,
        }
      : {
          center: <Text style={[styles.toolbarTitle, { color: theme.colors.textPrimary }]}>Messages</Text>,
          right: (
            <HeaderIconButton
              accessibilityLabel="Search conversations"
              icon="search"
              onPress={() => setSearchActive(true)}
            />
          ),
        };

  if (!isAuthenticated) {
    return (
      <MainTabScreenLayout toolbarProps={messagesToolbarProps}>
        <PageContainer>
          <AuthPromptCard
            description="Sign in to search conversations, reply in threads, and keep your Gatherle community in one place."
            onPressPrimary={() => navigation.navigate('Login')}
            onPressSecondary={() => navigation.navigate('Register')}
            primaryLabel="Login"
            secondaryLabel="Create account"
            title="Your inbox starts after sign-in"
          />
        </PageContainer>
      </MainTabScreenLayout>
    );
  }

  if (!authToken) {
    return (
      <MainTabScreenLayout toolbarProps={messagesToolbarProps}>
        <PageContainer>
          <StateNotice message="Log in with a real account token to load your conversations from the API." />
        </PageContainer>
      </MainTabScreenLayout>
    );
  }

  return (
    <MainTabScreenLayout toolbarProps={messagesToolbarProps}>
      <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
        {searchQuery.trim().length >= 2 ? (
          userSearchLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : userSearchResults.length > 0 ? (
            <View style={styles.messageList}>
              {userSearchResults.map((user) => {
                const displayName = getDisplayName(user);
                const avatarFallback = (
                  <View style={[styles.avatarFallback, { backgroundColor: theme.colors.primarySoft }]}>
                    <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>
                      {getInitials(displayName)}
                    </Text>
                  </View>
                );
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={user.userId}
                    onPress={() =>
                      navigation.navigate('MessageThread', {
                        avatarUrl: user.profile_picture ?? undefined,
                        displayName,
                        username: user.username ?? undefined,
                        withUserId: user.userId,
                      })
                    }
                    style={({ pressed }) => [
                      styles.userRow,
                      { borderBottomColor: theme.colors.border, opacity: pressed ? 0.82 : 1 },
                    ]}
                  >
                    <RemoteImage fallback={avatarFallback} uri={user.profile_picture} style={styles.avatar} />
                    <View style={styles.userInfo}>
                      <Text numberOfLines={1} style={[styles.userDisplayName, { color: theme.colors.textPrimary }]}>
                        {displayName}
                      </Text>
                      {user.username ? (
                        <Text numberOfLines={1} style={[styles.userHandle, { color: theme.colors.textSecondary }]}>
                          @{user.username}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <StateNotice message="No users found." />
          )
        ) : loading && filteredConversations.length === 0 ? (
          <View style={styles.messageList}>
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
            <ConversationRowSkeleton />
          </View>
        ) : error && failureKind !== 'session-expired' ? (
          <ScreenErrorState error={error} onRetry={() => void refetch()} resourceName="your conversations" />
        ) : filteredConversations.length > 0 ? (
          <View style={styles.messageList}>
            {filteredConversations.map((conversation) => (
              <SwipeableConversationRow
                conversation={conversation}
                key={conversation.conversationWithUserId}
                onPress={() =>
                  navigation.navigate('MessageThread', {
                    avatarUrl: conversation.conversationWithUser?.profile_picture,
                    displayName: getDisplayName(conversation.conversationWithUser),
                    username: conversation.conversationWithUser?.username,
                    withUserId: conversation.conversationWithUserId,
                  })
                }
                onToggleUnread={() =>
                  void (conversation.unreadCount > 0
                    ? markConversationRead(conversation.conversationWithUserId)
                    : markConversationUnread(conversation.conversationWithUserId))
                }
              />
            ))}
          </View>
        ) : (
          <StateNotice message="No conversations yet." title="No conversations yet" />
        )}
      </PageContainer>
    </MainTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: 999,
    height: 40,
    width: 40,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarFallbackText: {
    ...typography.displayBold,
    fontSize: 13,
  },
  loader: {
    marginTop: 24,
  },
  messageList: {
    gap: 0,
  },
  toolbarTitle: {
    ...typography.bodyBold,
    fontSize: fontSize.xl2,
    letterSpacing: -0.3,
  },
  userDisplayName: {
    ...typography.bodyMedium,
  },
  userHandle: {
    ...typography.bodyRegular,
    fontSize: 13,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
});
