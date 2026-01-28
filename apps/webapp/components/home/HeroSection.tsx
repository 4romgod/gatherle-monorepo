'use client';

import Link from 'next/link';
import { Explore } from '@mui/icons-material';
import { Box, Button, Card, Chip, Grid, Typography, Skeleton } from '@mui/material';
import CustomContainer from '@/components/core/layout/CustomContainer';
import { ROUTES, BUTTON_STYLES, BUTTON_PRIMARY_STYLES, RANDOM_IMAGE_LINK } from '@/lib/constants';
import { RRule } from 'rrule';
import { EventPreview } from '@/data/graphql/query/Event/types';

interface HeroSectionProps {
  heroEvent: EventPreview | null;
  isLoading?: boolean;
}

export default function HeroSection({ heroEvent, isLoading = false }: HeroSectionProps) {
  const heroEventRsvps = heroEvent?.participants?.length ?? 0;
  const showSkeleton = isLoading && !heroEvent;

  const renderSkeletonCard = () => (
    <Card
      elevation={0}
      sx={(theme) => ({
        p: { xs: 3, md: 4 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'hero.cardBorder',
        backgroundColor: 'hero.cardBg',
        color: 'hero.textSecondary',
        boxShadow: theme.shadows[4],
      })}
    >
      <Skeleton variant="text" width={140} height={16} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="60%" height={32} sx={{ fontWeight: 700, mb: 1 }} />
      <Skeleton variant="text" width="70%" height={18} sx={{ mb: 2 }} />
      <Box
        sx={{
          mt: 1,
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'hero.cardBorder',
        }}
      >
        <Skeleton variant="rectangular" width="100%" height={140} />
      </Box>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={90} height={18} />
        <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 2 }} />
      </Box>
    </Card>
  );

  return (
    <Box
      id="hero-section"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 7, md: 10 },
        px: { xs: 2, md: 3 },
        backgroundColor: 'hero.background',
        color: 'hero.textSecondary',
      }}
    >
      <CustomContainer>
        <Grid container spacing={4} alignItems="center" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Chip
              label="Gather boldly, host with ease"
              color="secondary"
              variant="outlined"
              sx={{
                mb: 3,
                borderColor: 'hero.cardBorder',
                color: 'hero.text',
                fontWeight: 700,
                letterSpacing: 0.6,
                backgroundColor: 'hero.cardBg',
              }}
            />
            <Typography
              variant="h1"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '2.6rem' },
                lineHeight: 1.1,
                mb: 2,
                color: 'hero.text',
              }}
            >
              Where unforgettable experiences find their people.
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 400,
                fontSize: { xs: '1rem', md: '1.08rem' },
                color: 'hero.textSecondary',
                mb: 3,
                opacity: 0.85,
              }}
            >
              Ntlango is the modern layer for community-led events—discover inspiring gatherings or host your own with
              gorgeous, human-first pages.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                component={Link}
                href={ROUTES.EVENTS.ROOT}
                startIcon={<Explore />}
                sx={{ ...BUTTON_PRIMARY_STYLES }}
              >
                Browse events
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                component={Link}
                href={ROUTES.AUTH.REGISTER}
                sx={{
                  ...BUTTON_STYLES,
                  px: 4,
                  py: 1.5,
                  borderColor: 'hero.cardBorder',
                  color: 'hero.text',
                  '&:hover': { borderColor: 'hero.text', backgroundColor: 'hero.cardBg' },
                }}
              >
                Sign up
              </Button>
            </Box>
            <Button
              variant="text"
              color="secondary"
              component={Link}
              href={ROUTES.ACCOUNT.EVENTS.CREATE}
              sx={{ fontWeight: 600 }}
            >
              Host with Ntlango
            </Button>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            {showSkeleton
              ? renderSkeletonCard()
              : heroEvent && (
                  <Card
                    elevation={0}
                    sx={(theme) => ({
                      p: { xs: 3, md: 4 },
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'hero.cardBorder',
                      backgroundColor: 'hero.cardBg',
                      color: 'hero.textSecondary',
                      boxShadow: theme.shadows[4],
                    })}
                  >
                    <Typography variant="overline" sx={{ color: 'hero.textSecondary', opacity: 0.7, letterSpacing: 1 }}>
                      Featured gathering
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: 'hero.text', mt: 1 }}>
                      {heroEvent.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'hero.textSecondary', opacity: 0.75, mt: 1.5 }}>
                      {heroEvent.recurrenceRule && RRule.fromString(heroEvent.recurrenceRule).toText()}
                    </Typography>
                    <Box
                      sx={{
                        mt: 3,
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'hero.cardBorder',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'relative',
                          paddingTop: '60%',
                          backgroundImage: `url(${heroEvent.media?.featuredImageUrl || RANDOM_IMAGE_LINK})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        mt: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 2,
                      }}
                    >
                      <Typography variant="body1" sx={{ color: 'hero.text', fontWeight: 600 }}>
                        {heroEventRsvps} RSVPs
                      </Typography>
                      <Button
                        variant="contained"
                        color="secondary"
                        size="small"
                        component={Link}
                        href={ROUTES.EVENTS.EVENT(heroEvent.slug)}
                        sx={BUTTON_STYLES}
                      >
                        View details
                      </Button>
                    </Box>
                  </Card>
                )}
          </Grid>
        </Grid>
      </CustomContainer>
    </Box>
  );
}
