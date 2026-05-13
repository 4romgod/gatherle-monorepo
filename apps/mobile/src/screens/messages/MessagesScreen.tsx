import type { ApolloError } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppShell } from '@/app/providers/AppShellProvider';
import type { MainTabNavigation } from '@/app/navigation/navigationTypes';
import { AuthPromptCard } from '@/components/auth/AuthPromptCard';
import { PageContainer } from '@/components/core/PageContainer';
import { PageHeading } from '@/components/core/PageHeading';
import { SearchField } from '@/components/core/SearchField';
import { StateNotice } from '@/components/core/StateNotice';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { getApolloErrorCode } from '@/features/auth/lib/apolloErrors';
import { useMessages } from '@/hooks/messages/useMessages';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export function MessagesScreen() {
  const navigation = useNavigation<MainTabNavigation>();
  const { authToken, hasLiveSession, isAuthenticated, signOut } = useAppShell();
  const { theme } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, error, loading, markConversationRead, refetch } = useMessages(authToken, isAuthenticated);

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

  useEffect(() => {
    if (!hasLiveSession || !error) {
      return;
    }

    if (getApolloErrorCode(error as ApolloError) !== 'UNAUTHENTICATED') {
      return;
    }

    signOut();
    navigation.navigate('Login', { redirectTab: 'Messages' });
  }, [error, hasLiveSession, navigation, signOut]);

  if (!isAuthenticated) {
    return (
      <PageContainer>
        <PageHeading title="Messages" />
        <AuthPromptCard
          description="Sign in to search conversations, reply in threads, and keep your Gatherle community in one place."
          onPressPrimary={() => navigation.navigate('Login')}
          onPressSecondary={() => navigation.navigate('Register')}
          primaryLabel="Login"
          secondaryLabel="Create account"
          title="Your inbox starts after sign-in"
        />
      </PageContainer>
    );
  }

  if (!authToken) {
    return (
      <PageContainer>
        <PageHeading title="Messages" />
        <StateNotice message="Log in with a real account token to load your conversations from the API." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeading title="Messages" />
      <SearchField onChangeText={setSearchQuery} placeholder="Search conversations" value={searchQuery} />
      <View style={[styles.pageDivider, { backgroundColor: theme.colors.border }]} />

      {loading && filteredConversations.length === 0 ? (
        <StateNotice message="Loading your conversations..." />
      ) : error ? (
        <StateNotice
          actionLabel="Retry"
          message="We couldn’t load your conversations."
          onPressAction={() => void refetch()}
        />
      ) : filteredConversations.length > 0 ? (
        <View style={styles.messageList}>
          {filteredConversations.map((conversation) => (
            <ConversationRow
              conversation={conversation}
              key={conversation.conversationWithUserId}
              onPress={() => void markConversationRead(conversation.conversationWithUserId)}
            />
          ))}
        </View>
      ) : (
        <StateNotice message="No conversations match your search yet." />
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  messageList: {
    gap: 0,
  },
  pageDivider: {
    height: 1,
    marginHorizontal: -20,
  },
});
