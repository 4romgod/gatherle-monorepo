'use client';

import React, { FormEvent, useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { filterOrganizationMembershipsThatCanManageEvents } from '@gatherle/commons/client/utils';
import {
  Autocomplete,
  Avatar,
  TextField,
  Button,
  Grid,
  Typography,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Box,
  SelectChangeEvent,
  Stack,
  FormControlLabel,
  Switch,
  Alert,
  InputAdornment,
  CircularProgress,
  IconButton,
  Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Link as LinkIcon, Save, CloudUpload, Close } from '@mui/icons-material';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useRouter } from 'next/navigation';
import {
  CreateEventInput,
  EventPrivacySetting,
  EventOrganizerRole,
  EventStatus,
  EventVisibility,
  EventLifecycleStatus,
  Location,
  QueryOptionsInput,
  SortOrderInput,
} from '@/data/graphql/types/graphql';
import { EventMutationFormProps, BUTTON_STYLES, SECTION_TITLE_STYLES, getEventCategoryIcon } from '@/lib/constants';
import CategoryFilter from '@/components/events/filters/category';
import EventLocationInput from './EventLocationInput';
import EventDateInput from './EventDateInput';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { usePersistentState } from '@/hooks';
import { useAspectRatioImageSelection } from '@/hooks/useAspectRatioImageSelection';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { MediaEntityType, MediaType } from '@/data/graphql/types/graphql';
import { STORAGE_NAMESPACES } from '@/hooks/usePersistentState';
import { useSession } from 'next-auth/react';
import { GetMyOrganizationsDocument } from '@/data/graphql/query/Organization/query';
import { GetUsersDocument } from '@/data/graphql/query/User/query';
import { CreateEventDocument, UpdateEventDocument } from '@/data/graphql/query/Event/mutation';
import { ROUTES } from '@/lib/constants';
import { WEB_MEDIA_CROP_PRESETS } from '@/lib/constants/media';
import { getAuthHeader } from '@/lib/utils/auth';

const EVENT_ORGANIZER_ROLES = [EventOrganizerRole.Host, EventOrganizerRole.CoHost, EventOrganizerRole.Volunteer];
const ORGANIZER_SEARCH_FIELDS = ['username', 'email', 'given_name', 'family_name'];
const ORGANIZER_SEARCH_LIMIT = 10;

type OrganizerUserOption = {
  email?: string | null;
  family_name?: string | null;
  given_name?: string | null;
  profile_picture?: string | null;
  userId: string;
  username?: string | null;
};
type PersistedOrganizerValue =
  | string
  | {
      user?: string | null;
      role?: EventOrganizerRole | string | null;
    }
  | null
  | undefined;
type EventOrganizerDraft = {
  user: string;
  role: EventOrganizerRole;
};
type EventMutationDraft = Omit<CreateEventInput, 'organizers'> & {
  organizers: PersistedOrganizerValue[];
};

const ORGANIZER_ROLE_PRIORITY: Record<EventOrganizerRole, number> = {
  [EventOrganizerRole.Host]: 0,
  [EventOrganizerRole.CoHost]: 1,
  [EventOrganizerRole.Volunteer]: 2,
};

function buildOrganizerSearchOptions(searchQuery: string): QueryOptionsInput {
  return {
    pagination: { limit: ORGANIZER_SEARCH_LIMIT },
    sort: [{ field: 'username', order: SortOrderInput.Asc }],
    search: {
      value: searchQuery,
      fields: ORGANIZER_SEARCH_FIELDS,
    },
  };
}

function formatOrganizerRoleLabel(role: EventOrganizerRole): string {
  if (role === EventOrganizerRole.CoHost) {
    return 'Co-host';
  }

  return role;
}

function formatOrganizerLabel(user?: Partial<OrganizerUserOption> | null, fallbackUserId?: string): string {
  if (!user && fallbackUserId) {
    return fallbackUserId;
  }

  if (!user) {
    return 'Unknown organizer';
  }

  if (user.username) {
    return `@${user.username}`;
  }

  const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }

  return user.email ?? fallbackUserId ?? 'Unknown organizer';
}

function formatOrganizerMeta(user?: Partial<OrganizerUserOption> | null): string | undefined {
  if (!user) {
    return undefined;
  }

  const fullName = [user.given_name, user.family_name].filter(Boolean).join(' ').trim();
  if (fullName && user.email) {
    return `${fullName} • ${user.email}`;
  }

  return fullName || user.email || undefined;
}

function getOrganizerInitials(user?: Partial<OrganizerUserOption> | null, fallbackUserId?: string): string {
  const fullName = [user?.given_name, user?.family_name].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName
      .split(/\s+/)
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join('');
  }

  const seed = user?.username || user?.email || fallbackUserId || 'O';
  return seed.slice(0, 2).toUpperCase();
}

function normalizeOrganizers(
  values: PersistedOrganizerValue[] | undefined,
  currentUserId?: string | null,
  options?: { ensureCurrentUserHost?: boolean },
): EventOrganizerDraft[] {
  const organizerRolesByUserId = new Map<string, EventOrganizerRole>();

  (values ?? []).forEach((value) => {
    let userId: string | undefined;
    let role: EventOrganizerRole | undefined;

    if (typeof value === 'string') {
      userId = value.trim();
      role = userId && userId === currentUserId ? EventOrganizerRole.Host : EventOrganizerRole.CoHost;
    } else if (value && typeof value === 'object' && typeof value.user === 'string') {
      userId = value.user.trim();
      role = EVENT_ORGANIZER_ROLES.includes(value.role as EventOrganizerRole)
        ? (value.role as EventOrganizerRole)
        : userId === currentUserId
          ? EventOrganizerRole.Host
          : EventOrganizerRole.CoHost;
    }

    if (!userId || !role) {
      return;
    }

    const existingRole = organizerRolesByUserId.get(userId);
    if (!existingRole || ORGANIZER_ROLE_PRIORITY[role] < ORGANIZER_ROLE_PRIORITY[existingRole]) {
      organizerRolesByUserId.set(userId, role);
    }
  });

  if (options?.ensureCurrentUserHost && currentUserId) {
    organizerRolesByUserId.set(currentUserId, EventOrganizerRole.Host);
  }

  return Array.from(organizerRolesByUserId.entries()).map(([user, role]) => ({ user, role }));
}

function hasHostOrganizer(organizers: EventOrganizerDraft[]): boolean {
  return organizers.some((organizer) => organizer.role === EventOrganizerRole.Host);
}

export default function EventMutationForm({ categoryList, event }: EventMutationFormProps) {
  const isEditMode = !!event;

  const router = useRouter();
  const theme = useTheme();
  const isMobileLayout = useMediaQuery(theme.breakpoints.down('md'));
  const draftEntityId = useRef(crypto.randomUUID());

  const { data: sessionData, status: sessionStatus } = useSession();
  const currentUserId = sessionData?.user?.userId;
  const { data: myOrganizationsData, loading: myOrganizationsLoading } = useQuery(GetMyOrganizationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: sessionStatus !== 'authenticated',
    context: {
      headers: getAuthHeader(sessionData?.user?.token),
    },
  });
  const [loadOrganizerCandidates, { data: organizerCandidatesData, loading: organizerSearchLoading }] = useLazyQuery(
    GetUsersDocument,
    {
      fetchPolicy: 'network-only',
    },
  );

  const defaultEventData = useMemo<EventMutationDraft>(() => {
    return {
      title: event?.title ?? '',
      summary: event?.summary ?? '',
      description: event?.description ?? '',
      location: event?.location ?? ({ locationType: 'venue' } as Location),
      primarySchedule: event?.primarySchedule
        ? {
            anchorStartAt: event.primarySchedule.anchorStartAt,
            occurrenceDurationMinutes: event.primarySchedule.occurrenceDurationMinutes ?? 0,
            timezone: event.primarySchedule.timezone ?? 'Africa/Johannesburg',
            recurrenceRule: event.primarySchedule.recurrenceRule ?? '',
          }
        : {
            anchorStartAt: undefined as unknown as Date,
            occurrenceDurationMinutes: 0,
            timezone: 'Africa/Johannesburg',
            recurrenceRule: '',
          },
      status: event?.status ?? EventStatus.Upcoming,
      lifecycleStatus: event?.lifecycleStatus ?? EventLifecycleStatus.Draft,
      visibility: event?.visibility ?? EventVisibility.Public,
      capacity: event?.capacity ?? 100,
      rsvpLimit: undefined,
      waitlistEnabled: false,
      allowGuestPlusOnes: false,
      remindersEnabled: true,
      showAttendees: true,
      eventCategories: event?.eventCategories?.map((c) => c.eventCategoryId) ?? [],
      organizers: normalizeOrganizers(
        event?.organizers?.map((organizer) => ({
          user: organizer.user.userId,
          role: organizer.role,
        })),
        currentUserId,
        {
          ensureCurrentUserHost: !isEditMode,
        },
      ),
      tags: event?.tags ?? {},
      media: event?.media ?? {},
      additionalDetails: {},
      comments: {},
      privacySetting: event?.privacySetting ?? EventPrivacySetting.Public,
      eventLink: event?.eventLink ?? '',
      orgId: event?.orgId ?? undefined,
      venueId: event?.venueId,
      locationSnapshot: undefined,
    };
  }, [currentUserId, event, isEditMode]);

  const persistenceId = event?.eventId ?? event?.slug ?? 'new';
  const {
    value: eventData,
    setValue: setEventData,
    clearStorage,
    isHydrated,
  } = usePersistentState<EventMutationDraft>(persistenceId, defaultEventData, {
    namespace: STORAGE_NAMESPACES.EVENT_MUTATION,
    userId: sessionData?.user?.userId,
    ttl: 1000 * 60 * 60 * 24 * 7,
    disabled: sessionStatus === 'unauthenticated',
    syncToBackend: false,
  });

  // Use default data during SSR and initial render to prevent hydration mismatch
  const displayEventData = isHydrated ? eventData : defaultEventData;
  const normalizedOrganizers = useMemo(
    () =>
      normalizeOrganizers(displayEventData.organizers, currentUserId, {
        ensureCurrentUserHost: !isEditMode,
      }),
    [currentUserId, displayEventData.organizers, isEditMode],
  );
  const hostOrganizerCount = normalizedOrganizers.filter(
    (organizer) => organizer.role === EventOrganizerRole.Host,
  ).length;

  const getFeaturedImageUrl = (media: unknown): string => {
    if (!media || typeof media !== 'object') {
      return '';
    }

    const maybeMedia = media as { featuredImageUrl?: unknown };

    return typeof maybeMedia.featuredImageUrl === 'string' ? maybeMedia.featuredImageUrl : '';
  };

  const featuredImageUrl = getFeaturedImageUrl(displayEventData.media);
  const eligibleOrganizations = filterOrganizationMembershipsThatCanManageEvents(
    myOrganizationsData?.readMyOrganizations,
  );

  const organizationHelperText = myOrganizationsLoading
    ? 'Loading your organizations...'
    : eligibleOrganizations.length > 0
      ? 'Owner, Admin, or Host roles can attach this organization to the event.'
      : 'No organizations with the required role were found.';
  const sectionSpacing = isMobileLayout ? 2.25 : 3;
  const sectionTitleSx = {
    ...SECTION_TITLE_STYLES,
    fontSize: isMobileLayout ? '1rem' : '1.125rem',
  };
  const choiceChipBaseSx = {
    borderRadius: 999,
    fontWeight: 600,
    maxWidth: '100%',
    minHeight: 34,
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  } as const;
  const helperCopySx = {
    mb: isMobileLayout ? 1 : 1.5,
  };

  const handleOrganizationChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setEventData((prev) => ({
      ...prev,
      orgId: value || undefined,
    }));
  };
  const handleOrganizationSelect = (orgId?: string) => {
    setEventData((prev) => ({
      ...prev,
      orgId: orgId || undefined,
    }));
  };

  const {
    upload: uploadFeaturedImage,
    uploading: featuredImageUploading,
    error: featuredImageError,
    reset: resetFeaturedImage,
  } = useMediaUpload({
    entityType: MediaEntityType.EventSeries,
    mediaType: MediaType.Featured,
    // In edit mode use the real eventId; in create mode use a stable draft UUID so
    // repeated "Change image" calls overwrite the same S3 path instead of scattering orphans.
    entityId: event?.eventId ?? draftEntityId.current,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDiscardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [organizerSearchInput, setOrganizerSearchInput] = useState('');
  const [selectedOrganizerCandidate, setSelectedOrganizerCandidate] = useState<OrganizerUserOption | null>(null);
  const {
    clearSelection: clearFeaturedImageSelection,
    cropDialog: featuredImageCropDialog,
    previewUrl: featuredImageCropPreview,
    selectFileForCrop: selectFeaturedImageForCrop,
  } = useAspectRatioImageSelection({
    onCropped: async ({ file }) => {
      const readUrl = await uploadFeaturedImage(file);
      setEventData((prev) => ({
        ...prev,
        media: { ...(prev.media ?? {}), featuredImageUrl: readUrl },
      }));
    },
    preset: WEB_MEDIA_CROP_PRESETS.eventCover,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [createEvent, { loading: createLoading }] = useMutation(CreateEventDocument, {
    context: { headers: getAuthHeader(sessionData?.user?.token) },
  });

  const [updateEvent, { loading: updateLoading }] = useMutation(UpdateEventDocument, {
    context: { headers: getAuthHeader(sessionData?.user?.token) },
  });

  const submitting = createLoading || updateLoading;
  const organizerIds = useMemo(
    () => new Set(normalizedOrganizers.map((organizer) => organizer.user)),
    [normalizedOrganizers],
  );
  const organizerCandidates = useMemo(
    () => (organizerCandidatesData?.readUsers ?? []).filter((user) => user.userId && !organizerIds.has(user.userId)),
    [organizerCandidatesData?.readUsers, organizerIds],
  );
  const organizerDirectory = useMemo(() => {
    const organizersById = new Map<string, OrganizerUserOption>();

    const registerUser = (user?: Partial<OrganizerUserOption> | null) => {
      if (!user?.userId) {
        return;
      }

      organizersById.set(user.userId, {
        userId: user.userId,
        username: user.username ?? null,
        email: user.email ?? null,
        given_name: user.given_name ?? null,
        family_name: user.family_name ?? null,
        profile_picture: user.profile_picture ?? null,
      });
    };

    event?.organizers?.forEach((organizer) => registerUser(organizer.user));
    organizerCandidates.forEach((user) => registerUser(user));
    registerUser({
      userId: currentUserId ?? undefined,
      username: sessionData?.user?.username,
      email: sessionData?.user?.email,
      given_name: sessionData?.user?.given_name,
      family_name: sessionData?.user?.family_name,
      profile_picture: sessionData?.user?.profile_picture,
    });

    return organizersById;
  }, [
    currentUserId,
    event?.organizers,
    organizerCandidates,
    sessionData?.user?.email,
    sessionData?.user?.family_name,
    sessionData?.user?.given_name,
    sessionData?.user?.profile_picture,
    sessionData?.user?.username,
  ]);

  const handleLocationChange = (newLocation: Location) => {
    setEventData((prev) => ({ ...prev, location: newLocation }));
  };

  const handleVenueChange = (venueId?: string | null) => {
    setEventData((prev) => ({ ...prev, venueId: venueId ?? undefined }));
  };

  const handleEventDateChange = useCallback(
    (recurrenceRule: string, anchorStartAt: Date, timezone: string, occurrenceDurationMinutes: number) => {
      setEventData((prev) => ({
        ...prev,
        primarySchedule: {
          ...(prev.primarySchedule ?? {}),
          recurrenceRule,
          anchorStartAt,
          timezone,
          occurrenceDurationMinutes,
        },
      }));
    },
    [setEventData],
  );

  const handleStatusChange = (event: SelectChangeEvent<EventStatus>) => {
    setEventData((prev) => ({ ...prev, status: event.target.value as EventStatus }));
  };

  const handleVisibilityChange = (event: SelectChangeEvent<EventVisibility>) => {
    setEventData((prev) => ({ ...prev, visibility: event.target.value as EventVisibility }));
  };
  const handleVisibilitySelect = (visibility: EventVisibility) => {
    setEventData((prev) => ({ ...prev, visibility }));
  };

  const handlePrivacyChange = (event: SelectChangeEvent<EventPrivacySetting>) => {
    setEventData((prev) => ({ ...prev, privacySetting: event.target.value as EventPrivacySetting }));
  };
  const handlePrivacySelect = (privacySetting: EventPrivacySetting) => {
    setEventData((prev) => ({ ...prev, privacySetting }));
  };

  const handleEventCategoryListChange = (eventCategories: string[]) => {
    setEventData((prev) => ({ ...prev, eventCategories }));
  };
  const toggleEventCategory = (categoryId: string) => {
    setEventData((prev) => ({
      ...prev,
      eventCategories: prev.eventCategories.includes(categoryId)
        ? prev.eventCategories.filter((id) => id !== categoryId)
        : [...prev.eventCategories, categoryId],
    }));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEventData((prev) => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
  };

  const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    setEventData((prev) => ({ ...prev, [name]: checked }));
  };

  useEffect(() => {
    const trimmedSearch = organizerSearchInput.trim();
    if (sessionStatus !== 'authenticated' || trimmedSearch.length < 2) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void loadOrganizerCandidates({
        variables: {
          options: buildOrganizerSearchOptions(trimmedSearch),
        },
        context: {
          headers: getAuthHeader(sessionData?.user?.token),
        },
      });
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [loadOrganizerCandidates, organizerSearchInput, sessionData?.user?.token, sessionStatus]);

  const handleAddOrganizer = useCallback(() => {
    const candidateUserId = selectedOrganizerCandidate?.userId;
    if (!candidateUserId) {
      return;
    }

    setEventData((prev) => {
      const nextOrganizers = normalizeOrganizers(prev.organizers, currentUserId, {
        ensureCurrentUserHost: !isEditMode,
      });

      if (nextOrganizers.some((organizer) => organizer.user === candidateUserId)) {
        return prev;
      }

      return {
        ...prev,
        organizers: [...nextOrganizers, { user: candidateUserId, role: EventOrganizerRole.CoHost }],
      };
    });
    setSelectedOrganizerCandidate(null);
    setOrganizerSearchInput('');
  }, [currentUserId, isEditMode, selectedOrganizerCandidate?.userId, setEventData]);

  const handleOrganizerRoleChange = useCallback(
    (userId: string, role: EventOrganizerRole) => {
      setEventData((prev) => {
        const nextOrganizers = normalizeOrganizers(prev.organizers, currentUserId, {
          ensureCurrentUserHost: !isEditMode,
        }).map((organizer) => (organizer.user === userId ? { ...organizer, role } : organizer));

        return {
          ...prev,
          organizers: nextOrganizers,
        };
      });
    },
    [currentUserId, isEditMode, setEventData],
  );

  const handleRemoveOrganizer = useCallback(
    (userId: string) => {
      setEventData((prev) => {
        const nextOrganizers = normalizeOrganizers(prev.organizers, currentUserId, {
          ensureCurrentUserHost: !isEditMode,
        });
        const organizerToRemove = nextOrganizers.find((organizer) => organizer.user === userId);
        const hostCount = nextOrganizers.filter((organizer) => organizer.role === EventOrganizerRole.Host).length;

        if (!organizerToRemove || (organizerToRemove.role === EventOrganizerRole.Host && hostCount === 1)) {
          return prev;
        }

        return {
          ...prev,
          organizers: nextOrganizers.filter((organizer) => organizer.user !== userId),
        };
      });
    },
    [currentUserId, isEditMode, setEventData],
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const submissionOrganizers = normalizeOrganizers(eventData.organizers, currentUserId, {
      ensureCurrentUserHost: !isEditMode,
    });

    if (!eventData.title?.trim()) newErrors.title = 'Title is required';
    if (!eventData.summary?.trim()) newErrors.summary = 'Summary is required';
    if (!eventData.description?.trim()) newErrors.description = 'Description is required';
    if (!eventData.primarySchedule?.recurrenceRule) newErrors.recurrenceRule = 'Event date is required';
    if (eventData.eventCategories.length === 0) newErrors.categories = 'Select at least one category';
    if (submissionOrganizers.length === 0) {
      newErrors.organizers = 'Add at least one organizer';
    } else if (!hasHostOrganizer(submissionOrganizers)) {
      newErrors.organizers = 'At least one organizer must be a host';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitError(null);

    try {
      const submissionOrganizers = normalizeOrganizers(eventData.organizers, currentUserId, {
        ensureCurrentUserHost: !isEditMode,
      });

      if (isEditMode && event?.eventId) {
        const { data } = await updateEvent({
          variables: {
            input: {
              eventId: event.eventId,
              title: eventData.title,
              summary: eventData.summary,
              description: eventData.description,
              primarySchedule: eventData.primarySchedule,
              location: eventData.location,
              venueId: eventData.venueId,
              status: eventData.status,
              lifecycleStatus: eventData.lifecycleStatus,
              visibility: eventData.visibility,
              capacity: eventData.capacity,
              rsvpLimit: eventData.rsvpLimit,
              waitlistEnabled: eventData.waitlistEnabled,
              allowGuestPlusOnes: eventData.allowGuestPlusOnes,
              remindersEnabled: eventData.remindersEnabled,
              showAttendees: eventData.showAttendees,
              eventCategories: eventData.eventCategories,
              media: eventData.media,
              privacySetting: eventData.privacySetting,
              eventLink: eventData.eventLink,
              orgId: eventData.orgId,
              organizers: submissionOrganizers,
              tags: eventData.tags,
            },
          },
        });

        const slug = data?.updateEvent.slug;
        if (slug) {
          clearStorage();
          setSuccessMessage('Event updated successfully!');
          router.push(ROUTES.EVENTS.EVENT(slug));
        } else {
          setSubmitError('Event updated, but the server did not return a destination event.');
        }
        return;
      }

      const { data } = await createEvent({
        variables: {
          input: {
            ...eventData,
            organizers: submissionOrganizers,
          },
        },
      });
      const slug = data?.createEvent.slug;
      if (slug) {
        clearStorage();
        setSuccessMessage('Event created successfully!');
        router.push(ROUTES.EVENTS.EVENT(slug));
      } else {
        setSubmitError('Event created, but the server did not return a destination event.');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to save event.');
    }
  };

  const handleDiscardDraft = () => {
    setDiscardDialogOpen(true);
  };

  const confirmDiscardDraft = () => {
    clearStorage();
    setErrors({});
    setDiscardDialogOpen(false);
  };

  const cancelDiscard = () => {
    setDiscardDialogOpen(false);
  };

  const organizationField = isMobileLayout ? (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Organization
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        <Chip
          label="Personal event"
          onClick={() => handleOrganizationSelect(undefined)}
          color={!displayEventData.orgId ? 'primary' : 'default'}
          variant={!displayEventData.orgId ? 'filled' : 'outlined'}
          sx={choiceChipBaseSx}
        />
        {eligibleOrganizations.map(({ organization }) => (
          <Chip
            key={organization.orgId}
            label={organization.name}
            onClick={() => handleOrganizationSelect(organization.orgId)}
            color={displayEventData.orgId === organization.orgId ? 'primary' : 'default'}
            variant={displayEventData.orgId === organization.orgId ? 'filled' : 'outlined'}
            sx={choiceChipBaseSx}
          />
        ))}
      </Stack>
      <Typography color="text.secondary" sx={{ mt: 1 }} variant="caption">
        {organizationHelperText}
      </Typography>
    </Box>
  ) : (
    <FormControl fullWidth disabled={!isMounted || myOrganizationsLoading}>
      <InputLabel id="organization-select-label">Organization</InputLabel>
      <Select
        labelId="organization-select-label"
        label="Organization"
        value={displayEventData.orgId ?? ''}
        onChange={handleOrganizationChange}
        sx={{ minWidth: 120 }}
      >
        <MenuItem value="">
          <em>No organization (personal event)</em>
        </MenuItem>
        {eligibleOrganizations.map(({ organization, role }) => (
          <MenuItem key={organization.orgId} value={organization.orgId}>
            {organization.name} ({role})
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>{organizationHelperText}</FormHelperText>
    </FormControl>
  );

  const eventLinkField = (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Event Link
      </Typography>
      {!isMobileLayout ? (
        <Typography variant="body2" color="text.secondary" sx={helperCopySx}>
          Add a link to your event website or registration page
        </Typography>
      ) : null}
      <TextField
        fullWidth
        placeholder={isMobileLayout ? 'https://...' : 'https://your-event-website.com'}
        name="eventLink"
        size="medium"
        color="secondary"
        value={displayEventData.eventLink}
        onChange={handleChange}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <LinkIcon color="action" />
              </InputAdornment>
            ),
          },
        }}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
      />
    </Box>
  );

  const featuredImageField = isMobileLayout ? (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Featured image (optional)
      </Typography>
      <Box
        component="label"
        sx={{
          display: 'block',
          width: '100%',
          cursor: featuredImageUploading ? 'progress' : 'pointer',
        }}
      >
        <input
          type="file"
          hidden
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            e.target.value = '';
            selectFeaturedImageForCrop(file);
          }}
        />
        {featuredImageCropPreview || featuredImageUrl ? (
          <Box
            component="img"
            src={featuredImageCropPreview || featuredImageUrl}
            alt="Featured image preview"
            sx={{
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ) : (
          <Box
            sx={{
              alignItems: 'center',
              aspectRatio: '16 / 9',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'center',
              px: 2,
              textAlign: 'center',
            }}
          >
            <Typography color="text.secondary" variant="body2">
              {featuredImageUploading ? 'Uploading…' : 'Tap to choose image'}
            </Typography>
          </Box>
        )}
      </Box>
      {featuredImageError ? (
        <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block' }}>
          {featuredImageError}
        </Typography>
      ) : null}
      {(featuredImageUrl || featuredImageCropPreview) && !featuredImageUploading ? (
        <Button
          color="secondary"
          onClick={() => {
            clearFeaturedImageSelection();
            resetFeaturedImage();
            setEventData((prev) => ({
              ...prev,
              media: { ...(prev.media ?? {}), featuredImageUrl: undefined },
            }));
          }}
          size="small"
          sx={{ mt: 1, px: 0, textTransform: 'none' }}
          variant="text"
        >
          Remove image
        </Button>
      ) : null}
    </Box>
  ) : (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Featured Image
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={helperCopySx}>
        Upload a 16:9 cover image for your event cards and event detail page.
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          component="label"
          variant="outlined"
          startIcon={featuredImageUploading ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
          disabled={featuredImageUploading}
          size="small"
        >
          {featuredImageUploading ? 'Uploading…' : featuredImageUrl ? 'Change image' : 'Upload image'}
          <input
            type="file"
            hidden
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = '';
              selectFeaturedImageForCrop(file);
            }}
          />
        </Button>
        {(featuredImageUrl || featuredImageCropPreview) && !featuredImageUploading && (
          <IconButton
            size="small"
            onClick={() => {
              clearFeaturedImageSelection();
              resetFeaturedImage();
              setEventData((prev) => ({
                ...prev,
                media: { ...(prev.media ?? {}), featuredImageUrl: undefined },
              }));
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        )}
      </Stack>
      {featuredImageError && (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {featuredImageError}
        </Typography>
      )}
      {(featuredImageCropPreview || featuredImageUrl) && (
        <Box
          component="img"
          src={featuredImageCropPreview || featuredImageUrl}
          alt="Featured image preview"
          sx={{
            width: '100%',
            maxWidth: 360,
            aspectRatio: '16 / 9',
            objectFit: 'cover',
            borderRadius: 2,
            mt: 1.5,
            border: '1px solid',
            borderColor: 'divider',
          }}
        />
      )}
    </Box>
  );

  const categoryField = isMobileLayout ? (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Categories
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {categoryList.map((category) => {
          const isSelected = displayEventData.eventCategories.includes(category.eventCategoryId);
          const IconComponent = getEventCategoryIcon(category.iconName);
          return (
            <Chip
              key={category.eventCategoryId}
              label={category.name}
              icon={
                <Box sx={{ display: 'flex', ml: 0.5 }}>
                  <IconComponent height={14} width={14} />
                </Box>
              }
              onClick={() => toggleEventCategory(category.eventCategoryId)}
              color={isSelected ? 'primary' : 'default'}
              variant={isSelected ? 'filled' : 'outlined'}
              sx={choiceChipBaseSx}
            />
          );
        })}
      </Stack>
      {errors.categories ? (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {errors.categories}
        </Typography>
      ) : null}
    </Box>
  ) : (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Event Categories *
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={helperCopySx}>
        Help people find your event by selecting relevant categories
      </Typography>
      <CategoryFilter
        categoryList={categoryList}
        onChange={handleEventCategoryListChange}
        value={displayEventData.eventCategories}
        sxProps={{ backgroundColor: 'transparent', backgroundImage: 'none', border: 'none', p: 0 }}
      />
      {errors.categories && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {errors.categories}
        </Typography>
      )}
    </Box>
  );

  const visibilityField = isMobileLayout ? (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Visibility
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {Object.values(EventVisibility).map((visibility) => (
          <Chip
            key={visibility}
            label={visibility}
            onClick={() => handleVisibilitySelect(visibility)}
            color={displayEventData.visibility === visibility ? 'primary' : 'default'}
            variant={displayEventData.visibility === visibility ? 'filled' : 'outlined'}
            sx={choiceChipBaseSx}
          />
        ))}
      </Stack>
    </Box>
  ) : null;

  const privacyField = isMobileLayout ? (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Privacy
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1}>
        {Object.values(EventPrivacySetting).map((privacy) => (
          <Chip
            key={privacy}
            label={privacy === EventPrivacySetting.Invitation ? 'Invite only' : privacy}
            onClick={() => handlePrivacySelect(privacy)}
            color={displayEventData.privacySetting === privacy ? 'primary' : 'default'}
            variant={displayEventData.privacySetting === privacy ? 'filled' : 'outlined'}
            sx={choiceChipBaseSx}
          />
        ))}
      </Stack>
    </Box>
  ) : null;

  const organizerField = (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
        Organizer team
      </Typography>
      {!isMobileLayout ? (
        <Typography variant="body2" color="text.secondary" sx={helperCopySx}>
          Add co-hosts or volunteers so the right people can manage this event across devices.
        </Typography>
      ) : null}
      <Stack spacing={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          <Autocomplete
            options={organizerCandidates}
            value={selectedOrganizerCandidate}
            inputValue={organizerSearchInput}
            onChange={(_, value) => setSelectedOrganizerCandidate(value)}
            onInputChange={(_, value) => setOrganizerSearchInput(value)}
            loading={organizerSearchLoading}
            getOptionLabel={(option) => formatOrganizerLabel(option, option.userId)}
            isOptionEqualToValue={(option, value) => option.userId === value.userId}
            filterOptions={(options) => options}
            noOptionsText={
              organizerSearchInput.trim().length < 2
                ? 'Type at least 2 characters to search'
                : organizerSearchLoading
                  ? 'Searching...'
                  : 'No eligible users found'
            }
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label="Add organizer"
                placeholder="Search by username, email, or name"
                size="small"
                color="secondary"
                helperText="Search by username, email, or name"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={option.userId}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                  <Avatar src={option.profile_picture ?? undefined} sx={{ width: 32, height: 32 }}>
                    {getOrganizerInitials(option, option.userId)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {formatOrganizerLabel(option, option.userId)}
                    </Typography>
                    {formatOrganizerMeta(option) ? (
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {formatOrganizerMeta(option)}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              </Box>
            )}
          />
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleAddOrganizer}
            disabled={!selectedOrganizerCandidate?.userId}
            sx={{ minWidth: { sm: 124 }, whiteSpace: 'nowrap' }}
          >
            Add
          </Button>
        </Stack>

        <Stack spacing={1}>
          {normalizedOrganizers.map((organizer) => {
            const organizerUser = organizerDirectory.get(organizer.user);
            const canRemoveOrganizer = !(organizer.role === EventOrganizerRole.Host && hostOrganizerCount === 1);

            return (
              <Box
                key={organizer.user}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 1.25,
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                    <Avatar src={organizerUser?.profile_picture ?? undefined}>
                      {getOrganizerInitials(organizerUser, organizer.user)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {formatOrganizerLabel(organizerUser, organizer.user)}
                        {organizer.user === currentUserId ? ' (you)' : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {formatOrganizerMeta(organizerUser) ?? organizer.user}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 132 }}>
                      <InputLabel id={`organizer-role-${organizer.user}`}>Role</InputLabel>
                      <Select
                        labelId={`organizer-role-${organizer.user}`}
                        label="Role"
                        value={organizer.role}
                        onChange={(event) =>
                          handleOrganizerRoleChange(organizer.user, event.target.value as EventOrganizerRole)
                        }
                      >
                        {EVENT_ORGANIZER_ROLES.map((role) => (
                          <MenuItem key={role} value={role}>
                            {formatOrganizerRoleLabel(role)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <IconButton
                      aria-label={`Remove organizer ${formatOrganizerLabel(organizerUser, organizer.user)}`}
                      onClick={() => handleRemoveOrganizer(organizer.user)}
                      disabled={!canRemoveOrganizer}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Stack>

        <Typography color={errors.organizers ? 'error.main' : 'text.secondary'} variant="caption">
          {errors.organizers ?? 'At least one host is required. Co-hosts and volunteers can help manage the event.'}
        </Typography>
      </Stack>
    </Box>
  );

  return (
    <>
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {!isMobileLayout ? organizationField : null}

          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              Please fix the errors below before submitting
            </Alert>
          )}

          <Box sx={{ py: isMobileLayout ? 0 : 4 }}>
            <Stack spacing={sectionSpacing}>
              <Typography variant="h6" sx={sectionTitleSx}>
                {isMobileLayout ? 'Basics' : 'Basic Information'}
              </Typography>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Event Title *
                </Typography>
                {!isMobileLayout ? (
                  <Typography variant="body2" color="text.secondary" sx={helperCopySx}>
                    Choose a clear, informative title that tells people exactly what your event is about
                  </Typography>
                ) : null}
                <TextField
                  required
                  fullWidth
                  placeholder="e.g., Summer Music Festival 2026"
                  name="title"
                  size="medium"
                  color="secondary"
                  value={displayEventData.title}
                  onChange={handleChange}
                  error={!!errors.title}
                  helperText={errors.title}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  Summary *
                </Typography>
                {!isMobileLayout ? (
                  <Typography variant="body2" color="text.secondary" sx={helperCopySx}>
                    Write a short, attention-grabbing description (shown in event listings)
                  </Typography>
                ) : null}
                <TextField
                  required
                  fullWidth
                  placeholder="A brief overview of your event..."
                  name="summary"
                  size="medium"
                  color="secondary"
                  multiline
                  rows={3}
                  value={displayEventData.summary}
                  onChange={handleChange}
                  error={!!errors.summary}
                  helperText={errors.summary}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {isMobileLayout ? 'Description *' : 'Full Description *'}
                </Typography>
                {!isMobileLayout ? (
                  <Typography variant="body2" color="text.secondary" sx={helperCopySx}>
                    Provide detailed information about your event, what to expect, and what guests need to know
                  </Typography>
                ) : null}
                <TextField
                  required
                  fullWidth
                  placeholder="Tell people all about your event..."
                  name="description"
                  size="medium"
                  color="secondary"
                  multiline
                  rows={6}
                  value={displayEventData.description}
                  onChange={handleChange}
                  error={!!errors.description}
                  helperText={errors.description}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>

              {isMobileLayout ? eventLinkField : null}
              {isMobileLayout ? featuredImageField : null}
            </Stack>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Stack spacing={sectionSpacing}>
              <Typography variant="h6" sx={sectionTitleSx}>
                {isMobileLayout ? 'Schedule' : 'Date & Location'}
              </Typography>
              <Box>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                  When is your event? *
                </Typography>
                <EventDateInput
                  onChange={handleEventDateChange}
                  restorePersistedState={!event}
                  value={displayEventData.primarySchedule}
                />
                {errors.recurrenceRule && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.recurrenceRule}
                  </Typography>
                )}
              </Box>
              {!isMobileLayout ? (
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                    Where is it happening? *
                  </Typography>
                  <EventLocationInput
                    onChange={handleLocationChange}
                    value={displayEventData.location}
                    venueId={displayEventData.venueId}
                    onVenueChange={handleVenueChange}
                  />
                </Box>
              ) : null}
            </Stack>
          </Box>

          {isMobileLayout ? (
            <Box sx={{ mb: 4 }}>
              <Stack spacing={sectionSpacing}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  Location
                </Typography>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
                    Where is it happening? *
                  </Typography>
                  <EventLocationInput
                    onChange={handleLocationChange}
                    value={displayEventData.location}
                    venueId={displayEventData.venueId}
                    onVenueChange={handleVenueChange}
                  />
                </Box>
              </Stack>
            </Box>
          ) : null}

          <Box sx={{ mb: 4 }}>
            <Stack spacing={sectionSpacing}>
              <Typography variant="h6" sx={sectionTitleSx}>
                {isMobileLayout ? 'Community context' : 'Categories & Media'}
              </Typography>
              {isMobileLayout ? organizationField : null}
              {organizerField}
              {categoryField}
              {!isMobileLayout ? featuredImageField : null}
              {!isMobileLayout ? eventLinkField : null}
            </Stack>
          </Box>

          {isMobileLayout ? (
            <Box sx={{ mb: 4 }}>
              <Stack spacing={sectionSpacing}>
                <Typography variant="h6" sx={sectionTitleSx}>
                  Access & settings
                </Typography>
                {visibilityField}
                {privacyField}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                    Capacity (optional)
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="e.g. 100"
                    name="capacity"
                    type="number"
                    size="medium"
                    color="secondary"
                    value={displayEventData.capacity || ''}
                    onChange={handleNumberChange}
                    slotProps={{ htmlInput: { min: 1 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                    RSVP limit (optional)
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Leave empty for no limit"
                    name="rsvpLimit"
                    type="number"
                    size="medium"
                    color="secondary"
                    value={displayEventData.rsvpLimit || ''}
                    onChange={handleNumberChange}
                    slotProps={{ htmlInput: { min: 1 } }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Box>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        name="waitlistEnabled"
                        checked={displayEventData.waitlistEnabled || false}
                        onChange={handleSwitchChange}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Waitlist
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Allow people to join a waitlist when the event is full.
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        name="allowGuestPlusOnes"
                        checked={displayEventData.allowGuestPlusOnes || false}
                        onChange={handleSwitchChange}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Allow plus-ones
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Let attendees bring a guest.
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        name="showAttendees"
                        checked={displayEventData.showAttendees !== false}
                        onChange={handleSwitchChange}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Show attendee list
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Display who is attending on the event page.
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        name="remindersEnabled"
                        checked={displayEventData.remindersEnabled !== false}
                        onChange={handleSwitchChange}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          Send reminders
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Automatically remind attendees before the event.
                        </Typography>
                      </Box>
                    }
                  />
                </Stack>
              </Stack>
            </Box>
          ) : (
            <>
              <Box sx={{ mb: 4 }}>
                <Stack spacing={3}>
                  <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem' }}>
                    Capacity & Attendee Settings
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        Event Capacity
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Maximum number of attendees
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="100"
                        name="capacity"
                        type="number"
                        size="medium"
                        color="secondary"
                        value={displayEventData.capacity || ''}
                        onChange={handleNumberChange}
                        slotProps={{ htmlInput: { min: 1 } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                        RSVP Limit
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        Optional RSVP limit (leave empty for no limit)
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="Optional"
                        name="rsvpLimit"
                        type="number"
                        size="medium"
                        color="secondary"
                        value={displayEventData.rsvpLimit || ''}
                        onChange={handleNumberChange}
                        slotProps={{ htmlInput: { min: 1 } }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    </Grid>
                  </Grid>
                  <Stack spacing={2}>
                    <FormControlLabel
                      control={
                        <Switch
                          name="waitlistEnabled"
                          checked={displayEventData.waitlistEnabled || false}
                          onChange={handleSwitchChange}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Enable Waitlist
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Allow people to join a waitlist when event is full
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          name="allowGuestPlusOnes"
                          checked={displayEventData.allowGuestPlusOnes || false}
                          onChange={handleSwitchChange}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Allow Plus Ones
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Let attendees bring a guest
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          name="showAttendees"
                          checked={displayEventData.showAttendees !== false}
                          onChange={handleSwitchChange}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Show Attendee List
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Display who's attending on the event page
                          </Typography>
                        </Box>
                      }
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          name="remindersEnabled"
                          checked={displayEventData.remindersEnabled !== false}
                          onChange={handleSwitchChange}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            Send Reminders
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Automatically remind attendees before the event
                          </Typography>
                        </Box>
                      }
                    />
                  </Stack>
                </Stack>
              </Box>

              <Box sx={{ py: 4 }}>
                <Stack spacing={3}>
                  <Typography variant="h6" sx={{ ...SECTION_TITLE_STYLES, fontSize: '1.125rem' }}>
                    Event Settings
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth size="medium">
                        <InputLabel color="secondary">Status</InputLabel>
                        <Select
                          name="status"
                          value={displayEventData.status}
                          onChange={handleStatusChange}
                          color="secondary"
                          label="Status"
                          sx={{ borderRadius: 2 }}
                        >
                          {Object.values(EventStatus).map((status) => (
                            <MenuItem key={status} value={status}>
                              {status}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth size="medium">
                        <InputLabel color="secondary">Visibility</InputLabel>
                        <Select
                          name="visibility"
                          value={displayEventData.visibility || ''}
                          onChange={handleVisibilityChange}
                          color="secondary"
                          label="Visibility"
                          sx={{ borderRadius: 2 }}
                        >
                          {Object.values(EventVisibility).map((visibility) => (
                            <MenuItem key={visibility} value={visibility}>
                              {visibility}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth size="medium">
                        <InputLabel color="secondary">Privacy</InputLabel>
                        <Select
                          name="privacySetting"
                          value={displayEventData.privacySetting || ''}
                          onChange={handlePrivacyChange}
                          color="secondary"
                          label="Privacy"
                          sx={{ borderRadius: 2 }}
                        >
                          {Object.values(EventPrivacySetting).map((privacy) => (
                            <MenuItem key={privacy} value={privacy}>
                              {privacy}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Stack>
              </Box>
            </>
          )}

          {/* Submit */}
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" spacing={2} sx={{ pt: 2 }}>
            {!isMobileLayout ? (
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                onClick={handleDiscardDraft}
                sx={{ ...BUTTON_STYLES, px: 4 }}
              >
                Discard draft
              </Button>
            ) : null}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={submitting || featuredImageUploading}
              startIcon={
                submitting || featuredImageUploading ? <CircularProgress size={20} color="inherit" /> : <Save />
              }
              sx={{ ...BUTTON_STYLES, px: 4, width: { xs: '100%', sm: 'auto' } }}
            >
              {submitting || featuredImageUploading ? 'Saving…' : isEditMode ? 'Save Changes' : 'Create Event'}
            </Button>
          </Stack>
        </Stack>
      </Box>
      {submitError && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ borderRadius: 2 }}>
          {successMessage}
        </Alert>
      </Snackbar>
      <ConfirmDialog
        open={isDiscardDialogOpen}
        title="Discard draft?"
        description="Discarding will remove the saved draft from this browser. You can always start again from scratch."
        confirmLabel="Discard"
        onConfirm={confirmDiscardDraft}
        onCancel={cancelDiscard}
      />
      {featuredImageCropDialog}
    </>
  );
}
