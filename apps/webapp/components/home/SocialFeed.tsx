import Link from 'next/link';
import { DynamicFeed, People, PersonAdd, Event as EventIcon, Person, Business } from '@mui/icons-material';
import { Avatar, Box, Button, Card, Chip, Grid, Stack, Typography } from '@mui/material';
import CustomContainer from '@/components/core/layout/CustomContainer';
import { ROUTES, CARD_STYLES, BUTTON_PRIMARY_STYLES, SECTION_TITLE_STYLES } from '@/lib/constants';
import { GetSocialFeedQuery } from '@/data/graphql/types/graphql';
import { JSX } from 'react';

type SocialHighlight = {
  title: string;
  description: string;
  icon: JSX.Element;
};

const socialHighlights: SocialHighlight[] = [
  {
    title: 'Follow the people who inspire you',
    description: 'Track hosts, friends, and organizations with updates that land directly on your feed.',
    icon: <People fontSize="small" color="primary" />,
  },
  {
    title: 'Share RSVP intent with the right crowd',
    description: 'Control whether your Going or Interested signals are public or kept within your followers.',
    icon: <PersonAdd fontSize="small" color="primary" />,
  },
  {
    title: 'See the moments that matter',
    description: 'Activity cards surface RSVPs, launches, and check-ins from your circle.',
    icon: <DynamicFeed fontSize="small" color="primary" />,
  },
];

const verbLabels: Record<string, string> = {
  Followed: 'followed',
  RSVPd: "RSVP'd to",
  Commented: 'commented on',
  Published: 'published',
  CreatedOrg: 'created',
  CheckedIn: 'checked in to',
  Invited: 'invited someone to',
};

const formatActivityDate = (value?: string | Date | null): string | null => {
  if (!value) {
    return null;
  }
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

type FeedActivity = GetSocialFeedQuery['readFeed'][number];

const getActorDisplayName = (activity: FeedActivity): string => {
  if (activity.actor) {
    const { given_name, family_name, username } = activity.actor;
    if (given_name || family_name) {
      return [given_name, family_name].filter(Boolean).join(' ');
    }
    return username || 'Someone';
  }
  return 'Someone';
};

const getObjectLabel = (activity: FeedActivity): string => {
  if (activity.objectType === 'EventSeries' && activity.objectEvent) {
    return activity.objectEvent.title || 'an event';
  }
  if (activity.objectType === 'User' && activity.objectUser) {
    const { given_name, family_name, username } = activity.objectUser;
    if (given_name || family_name) {
      return [given_name, family_name].filter(Boolean).join(' ');
    }
    return `@${username}` || 'a user';
  }
  if (activity.objectType === 'Organization' && activity.objectOrganization) {
    return activity.objectOrganization.name || 'an organization';
  }
  return activity.objectType?.toLowerCase() || 'something';
};

const getObjectLink = (activity: FeedActivity): string | null => {
  if (activity.objectType === 'EventSeries' && activity.objectEvent?.slug) {
    return ROUTES.EVENTS.EVENT(activity.objectEvent.slug);
  }
  if (activity.objectType === 'User' && activity.objectUser?.username) {
    return ROUTES.USERS.USER(activity.objectUser.username);
  }
  if (activity.objectType === 'Organization' && activity.objectOrganization?.slug) {
    return ROUTES.ORGANIZATIONS.ORG(activity.objectOrganization.slug);
  }
  return null;
};

interface SocialFeedProps {
  isAuthenticated: boolean;
  hasToken: boolean;
  socialFeed: GetSocialFeedQuery['readFeed'];
}

export default function SocialFeed({ isAuthenticated, hasToken, socialFeed }: SocialFeedProps) {
  const socialCtaLabel = isAuthenticated
    ? 'View your feed'
    : hasToken
      ? 'Refresh your session to unlock socials'
      : 'Sign in to unlock socials';

  const feedPlaceholderCopy = isAuthenticated
    ? 'Follow people and join events to see this feed light up.'
    : hasToken
      ? 'Refresh your credentials to view personalized social updates.'
      : 'Sign in to surface personalized social updates from your follow network.';

  return (
    <Box
      id="social-layer"
      sx={{
        backgroundColor: 'background.default',
        py: { xs: 5, md: 7 },
        px: { xs: 1, md: 2 },
      }}
    >
      <CustomContainer>
        <Grid container spacing={6} alignItems="stretch">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h4" sx={{ ...SECTION_TITLE_STYLES, mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}>
              Social layer
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Follow hosts, friends, and organizations, share your intent with the right audience, and catch the moments
              your circle is creating in one place.
            </Typography>
            <Stack spacing={1}>
              {socialHighlights.map((highlight) => (
                <Card
                  key={highlight.title}
                  elevation={0}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box>{highlight.icon}</Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="600">
                      {highlight.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {highlight.description}
                    </Typography>
                  </Box>
                </Card>
              ))}
            </Stack>
            <Box sx={{ mt: 3 }}>
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                href={isAuthenticated ? ROUTES.EVENTS.ROOT : ROUTES.AUTH.LOGIN}
                sx={{ ...BUTTON_PRIMARY_STYLES, borderRadius: 999 }}
              >
                {socialCtaLabel}
              </Button>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                ...CARD_STYLES,
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Typography variant="h6" sx={SECTION_TITLE_STYLES}>
                Activity preview
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Live updates shaped by the people you follow.
              </Typography>
              <Stack spacing={2} flexGrow={1}>
                {isAuthenticated && socialFeed.length > 0 ? (
                  socialFeed.map((activity) => {
                    const actorName = getActorDisplayName(activity);
                    const objectLabel = getObjectLabel(activity);
                    const objectLink = getObjectLink(activity);
                    const verbLabel = verbLabels[activity.verb] ?? activity.verb;
                    const timestampLabel = formatActivityDate(activity.createdAt ?? activity.eventAt);
                    const actorLink = activity.actor?.username ? ROUTES.USERS.USER(activity.actor.username) : null;

                    const getActivityIcon = () => {
                      if (activity.objectType === 'EventSeries') return <EventIcon sx={{ fontSize: 14 }} />;
                      if (activity.objectType === 'User') return <Person sx={{ fontSize: 14 }} />;
                      if (activity.objectType === 'Organization') return <Business sx={{ fontSize: 14 }} />;
                      return null;
                    };

                    return (
                      <Box
                        key={activity.activityId}
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          p: 1.5,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                          transition: 'border-color 0.2s',
                          '&:hover': {
                            borderColor: 'text.secondary',
                          },
                        }}
                      >
                        {actorLink ? (
                          <Link href={actorLink} style={{ textDecoration: 'none' }}>
                            <Avatar
                              src={activity.actor?.profile_picture || undefined}
                              alt={actorName}
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: 'action.selected',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                              }}
                            >
                              {actorName.charAt(0).toUpperCase()}
                            </Avatar>
                          </Link>
                        ) : (
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: 'action.selected',
                              fontSize: '0.875rem',
                            }}
                          >
                            {actorName.charAt(0).toUpperCase()}
                          </Avatar>
                        )}

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ lineHeight: 1.4 }}>
                            {actorLink ? (
                              <Link href={actorLink} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <Typography
                                  component="span"
                                  sx={{ fontWeight: 600, '&:hover': { color: 'primary.main' } }}
                                >
                                  {actorName}
                                </Typography>
                              </Link>
                            ) : (
                              <Typography component="span" sx={{ fontWeight: 600 }}>
                                {actorName}
                              </Typography>
                            )}{' '}
                            <Typography component="span" color="text.secondary">
                              {verbLabel}
                            </Typography>{' '}
                            {objectLink ? (
                              <Link href={objectLink} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <Typography
                                  component="span"
                                  sx={{ fontWeight: 600, '&:hover': { color: 'primary.main' } }}
                                >
                                  {objectLabel}
                                </Typography>
                              </Link>
                            ) : (
                              <Typography component="span" sx={{ fontWeight: 600 }}>
                                {objectLabel}
                              </Typography>
                            )}
                          </Typography>

                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            {timestampLabel && (
                              <Typography variant="caption" color="text.secondary">
                                {timestampLabel}
                              </Typography>
                            )}
                            {activity.objectType && (
                              <Chip
                                size="small"
                                icon={getActivityIcon() || undefined}
                                label={activity.objectType}
                                sx={{
                                  height: 20,
                                  fontSize: '0.65rem',
                                  bgcolor: 'action.selected',
                                  '& .MuiChip-icon': { fontSize: 12, ml: 0.5 },
                                  '& .MuiChip-label': { px: 0.75 },
                                }}
                              />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Box
                    sx={{
                      borderRadius: 3,
                      border: '1px dashed',
                      borderColor: 'divider',
                      p: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {feedPlaceholderCopy}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </CustomContainer>
    </Box>
  );
}
