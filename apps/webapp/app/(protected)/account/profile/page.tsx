import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Cake as CakeIcon,
  Wc as GenderIcon,
  Event as EventIcon,
  CheckCircle as RSVPIcon,
} from '@mui/icons-material';
import { auth } from '@/auth';
import { differenceInYears, format } from 'date-fns';
import { GetAllEventsDocument } from '@/data/graphql/types/graphql';
import { getClient } from '@/data/graphql';
import EventsCarousel from '@/components/events/carousel';
import EventCategoryChip from '@/components/events/category/chip';
import Link from 'next/link';
import { ROUTES } from '@/lib/constants';
import { omit } from 'lodash';

export default async function UserPublicProfile() {
  const session = await auth();
  if (!session) return;
  const user = omit(session.user, ['token', '__typename']);

  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
  });
  const rsvpdEvents = events.readEvents.filter((event) => event.rSVPList.some(rsvp => rsvp.userId === user.userId));
  const organizedEvents = events.readEvents.filter((event) => event.organizerList.some(organizer => organizer.userId === user.userId));
  const interests = user.interests ? user.interests : [];
  const age = differenceInYears(new Date(), new Date(user.birthdate));
  const formattedDOB = format(new Date(user.birthdate), 'dd MMMM yyyy');

  return (
    <Box sx={{ py: 2, backgroundColor: 'background.paper' }}>
      <Container maxWidth="md">
        <Paper
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: { xs: 'none', sm: 3 },
            border: { xs: '1px solid', sm: 'none' },
            borderColor: { xs: 'divider', sm: 'transparent' },
          }}
        >
          {/* Profile Header */}
          <Box
            sx={{
              height: 200,
              position: 'relative',
              backgroundColor: 'secondary.main',
            }}
          >
            <Link href={ROUTES.ACCOUNT.ROOT}>
              <Button
                startIcon={<EditIcon />}
                variant="contained"
                color="inherit"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  borderRadius: 8,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  '&:hover': {
                    bgcolor: 'background.default',
                  }
                }}
              >
                Edit
              </Button>
            </Link>
          </Box>

          {/* Profile Picture */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mt: -10,
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={user.profile_picture || "/api/placeholder/120/120"}
                alt={`${user.given_name} ${user.family_name}`}
                sx={{
                  width: 160,
                  height: 160,
                  border: '4px solid white',
                  boxShadow: 3,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  width: 20,
                  height: 20,
                  bgcolor: 'success.main',
                  borderRadius: '50%',
                  border: '2px solid white',
                }}
              />
            </Box>
          </Box>

          {/* User Info */}
          <Box sx={{ textAlign: 'center', px: 3, py: 2 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              {user.given_name} {user.family_name}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                @{user.username}
              </Typography>
              <Divider orientation="vertical" flexItem sx={{ mx: 2, height: 16 }} />
              <Chip
                label={user.userRole}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Bio */}
          <Box sx={{ px: 3, py: 2 }}>
            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ maxWidth: 800, mx: 'auto' }}
            >
              {user.bio || ''}
            </Typography>
          </Box>

          {/* Details Section */}
          <CardContent sx={{ px: 3, py: 4 }}>
            <Grid container spacing={4}>
              {/* User Information */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardHeader
                    title="Personal Information"
                    slotProps={{ title: { variant: 'h6', fontWeight: 'medium' } }}
                  />
                  <Divider />
                  <CardContent>
                    <List disablePadding>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <EmailIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Email"
                          secondary={user.email}
                          slotProps={{
                            primary: { variant: 'body2', color: 'text.secondary' },
                            secondary: { variant: 'body1' },
                          }}
                        />
                      </ListItem>

                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <PhoneIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Phone"
                          secondary={user.phone_number || "Not provided"}
                          slotProps={{
                            primary: { variant: 'body2', color: 'text.secondary' },
                            secondary: { variant: 'body1' },
                          }}
                        />
                      </ListItem>

                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <LocationIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Address"
                          secondary={JSON.stringify(user.address)}  // TODO make it nice
                          slotProps={{
                            primary: { variant: 'body2', color: 'text.secondary' },
                            secondary: { variant: 'body1' },
                          }}
                        />
                      </ListItem>

                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <CakeIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Birthday"
                          secondary={`${formattedDOB} (${age} years old)`}
                          slotProps={{
                            primary: { variant: 'body2', color: 'text.secondary' },
                            secondary: { variant: 'body1' },
                          }}
                        />
                      </ListItem>

                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <GenderIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary="Gender"
                          secondary={user.gender || "Not specified"}
                          slotProps={{
                            primary: { variant: 'body2', color: 'text.secondary' },
                            secondary: { variant: 'body1' },
                          }}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              {/* Interests */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardHeader
                    title="Interests"
                    slotProps={{ title: { variant: 'h6', fontWeight: 'medium' } }}
                  />
                  <Divider />
                  <CardContent>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {interests.map((category, index) => (
                        <EventCategoryChip
                          key={index}
                          category={category}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>

          {/* Events Section */}
          <Box sx={{ px: 3, pb: 4 }}>
            {/* Created Events Section */}
            <Box>
              {organizedEvents.length > 0 ? (
                <EventsCarousel
                  events={organizedEvents}
                  title={`Events Created by ${user.given_name}`}
                  autoplay={true}
                  autoplayInterval={6000}
                  itemWidth={350}
                  showIndicators={true}
                  viewAllEventsButton={false}
                />
              ) : (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <EventIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No events created yet
                  </Typography>
                </Paper>
              )}
            </Box>

            {/* RSVP'd Events Section */}
            <Box>
              {rsvpdEvents.length > 0 ? (
                <EventsCarousel
                  events={rsvpdEvents}
                  title={`Events ${user.given_name} is Attending`}
                  autoplay={true}
                  autoplayInterval={6000}
                  itemWidth={350}
                  showIndicators={true}
                  viewAllEventsButton={false}
                />
              ) : (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                  <RSVPIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No RSVPs yet
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: 'background.default',
              borderTop: 1,
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              User ID: {user.userId}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Member since 2021
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
