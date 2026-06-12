'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  AttachFileOutlined,
  BugReportOutlined,
  CloseOutlined,
  HealthAndSafetyOutlined,
  HelpOutlineOutlined,
  LightbulbOutlined,
  SendOutlined,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { SUPPORT_REQUEST_LIMITS, SUPPORT_REQUEST_SCREENSHOT_MAX_MB } from '@gatherle/commons/client/constants';
import { MediaEntityType, MediaType, SupportRequestKind } from '@/data/graphql/types/graphql';
import AccountHubShell from '@/components/account/AccountHubShell';
import type { AccountToolbarUser } from '@/components/account/AccountToolbarControls';
import { CreateSupportRequestDocument } from '@/data/graphql/mutation/SupportRequest/mutation';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { getAuthHeader } from '@/lib/utils/auth';

type SupportRequestPageClientProps = {
  contactEmail: string;
  user: AccountToolbarUser;
};

type KindOption = {
  description: string;
  icon: typeof HelpOutlineOutlined;
  label: string;
  value: SupportRequestKind;
};

const KIND_OPTIONS: KindOption[] = [
  {
    description: 'Ask for help when something is blocking you.',
    icon: HelpOutlineOutlined,
    label: 'Get help',
    value: SupportRequestKind.Help,
  },
  {
    description: 'Report something broken or confusing.',
    icon: BugReportOutlined,
    label: 'Report a bug',
    value: SupportRequestKind.Bug,
  },
  {
    description: 'Suggest an improvement to Gatherle.',
    icon: LightbulbOutlined,
    label: 'Suggest an idea',
    value: SupportRequestKind.Idea,
  },
  {
    description: 'Flag safety, abuse, or trust issues.',
    icon: HealthAndSafetyOutlined,
    label: 'Trust & safety',
    value: SupportRequestKind.TrustAndSafety,
  },
];

const SCREENSHOT_LIMIT_LABEL = `${SUPPORT_REQUEST_SCREENSHOT_MAX_MB} MB`;

export default function SupportRequestPageClient({ contactEmail, user }: SupportRequestPageClientProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = session?.user?.token;
  const [kind, setKind] = useState<SupportRequestKind>(SupportRequestKind.Help);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createSupportRequest, { loading: submitting }] = useMutation(CreateSupportRequestDocument, {
    context: {
      headers: getAuthHeader(token),
    },
  });
  const {
    upload: uploadScreenshot,
    uploading: screenshotUploading,
    error: screenshotError,
  } = useMediaUpload({
    entityType: MediaEntityType.SupportRequest,
    mediaType: MediaType.Attachment,
  });

  const pagePath = useMemo(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(screenshotFile);
    setScreenshotPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [screenshotFile]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSubmitError(null);
    setSuccessMessage(null);

    if (file && file.size > SUPPORT_REQUEST_LIMITS.screenshotMaxBytes) {
      setScreenshotFile(null);
      setSubmitError(`Screenshots must be ${SCREENSHOT_LIMIT_LABEL} or smaller.`);
      event.target.value = '';
      return;
    }

    setScreenshotFile(file);
    event.target.value = '';
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (trimmedSubject.length < SUPPORT_REQUEST_LIMITS.subjectMinLength) {
      setSubmitError('Add a short subject so we can triage this quickly.');
      return;
    }

    if (trimmedSubject.length > SUPPORT_REQUEST_LIMITS.subjectMaxLength) {
      setSubmitError(`Keep the subject under ${SUPPORT_REQUEST_LIMITS.subjectMaxLength} characters.`);
      return;
    }

    if (trimmedMessage.length < SUPPORT_REQUEST_LIMITS.messageMinLength) {
      setSubmitError('Add a bit more detail so we know how to help.');
      return;
    }

    if (trimmedMessage.length > SUPPORT_REQUEST_LIMITS.messageMaxLength) {
      setSubmitError(`Keep the details under ${SUPPORT_REQUEST_LIMITS.messageMaxLength} characters.`);
      return;
    }

    try {
      let screenshotUrl: string | undefined;

      if (screenshotFile) {
        screenshotUrl = await uploadScreenshot(screenshotFile);
      }

      const { data } = await createSupportRequest({
        variables: {
          input: {
            kind,
            message: trimmedMessage,
            pagePath,
            screenshotUrl,
            subject: trimmedSubject,
          },
        },
      });

      const createdRequest = data?.createSupportRequest;
      if (!createdRequest) {
        throw new Error('We could not send your request right now.');
      }

      setSubject('');
      setMessage('');
      setScreenshotFile(null);
      setSuccessMessage(
        `Request sent. We will follow up at ${contactEmail}. Reference: ${createdRequest.supportRequestId}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not send your request right now.';
      setSubmitError(message);
    }
  };

  const busy = submitting || screenshotUploading;

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh', py: { xs: 0, md: 2.5 } }}>
      <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2, md: 3 } }}>
        <AccountHubShell user={user}>
          <Stack spacing={3}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: { xs: 0, md: 3 },
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={1.5}>
                  <Typography color="primary" variant="overline" sx={{ fontWeight: 800, letterSpacing: '0.12em' }}>
                    Help & Feedback
                  </Typography>
                  <Typography sx={{ fontSize: { xs: '1.5rem', md: '1.875rem' }, fontWeight: 800, lineHeight: 1.05 }}>
                    Tell us what happened
                  </Typography>
                  <Typography color="text.secondary">
                    Use this when something breaks, when you need help, or when you want to suggest a sharper version of
                    Gatherle. We will follow up at {contactEmail}.
                  </Typography>
                </Stack>
              </CardContent>
            </Card>

            {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}
            {submitError ? <Alert severity="error">{submitError}</Alert> : null}
            {screenshotError ? <Alert severity="error">{screenshotError}</Alert> : null}

            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: { xs: 0, md: 3 },
              }}
            >
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Stack spacing={3}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, mb: 1.25 }}>What do you need?</Typography>
                    <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap">
                      {KIND_OPTIONS.map((option) => {
                        const selected = option.value === kind;
                        const Icon = option.icon;

                        return (
                          <Button
                            key={option.value}
                            color={selected ? 'primary' : 'inherit'}
                            onClick={() => setKind(option.value)}
                            startIcon={<Icon fontSize="small" />}
                            sx={{
                              borderRadius: 999,
                              justifyContent: 'flex-start',
                              px: 1.75,
                            }}
                            variant={selected ? 'contained' : 'outlined'}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 1.25 }} variant="body2">
                      {KIND_OPTIONS.find((option) => option.value === kind)?.description}
                    </Typography>
                  </Box>

                  <TextField
                    color="secondary"
                    fullWidth
                    helperText={`Keep it concise. ${subject.length}/${SUPPORT_REQUEST_LIMITS.subjectMaxLength}`}
                    inputProps={{ maxLength: SUPPORT_REQUEST_LIMITS.subjectMaxLength }}
                    label="Subject"
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Push alerts are enabled but I never get them"
                    value={subject}
                  />

                  <TextField
                    color="secondary"
                    fullWidth
                    helperText={`Include enough detail to reproduce it. ${message.length}/${SUPPORT_REQUEST_LIMITS.messageMaxLength}`}
                    inputProps={{ maxLength: SUPPORT_REQUEST_LIMITS.messageMaxLength }}
                    label="Details"
                    minRows={6}
                    multiline
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="What were you trying to do, what happened instead, and how can we reproduce it?"
                    value={message}
                  />

                  <Box>
                    <Typography sx={{ fontWeight: 700, mb: 1.25 }}>Screenshot</Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }}>
                      <Button
                        component="label"
                        startIcon={<AttachFileOutlined />}
                        sx={{ alignSelf: 'flex-start', borderRadius: 999 }}
                        variant="outlined"
                      >
                        {screenshotFile ? 'Replace screenshot' : 'Attach screenshot'}
                        <input
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          hidden
                          onChange={handleFileChange}
                          type="file"
                        />
                      </Button>
                      {screenshotFile ? (
                        <Button
                          color="inherit"
                          onClick={handleRemoveScreenshot}
                          startIcon={<CloseOutlined />}
                          sx={{ alignSelf: 'flex-start', borderRadius: 999 }}
                        >
                          Remove
                        </Button>
                      ) : null}
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 1.25 }} variant="body2">
                      Optional. Attach a screenshot when the problem is easier to explain visually. JPG, PNG, WebP, or
                      GIF up to {SCREENSHOT_LIMIT_LABEL}.
                    </Typography>
                    {screenshotFile ? (
                      <Stack spacing={1.25} sx={{ mt: 2 }}>
                        <Typography variant="body2">{screenshotFile.name}</Typography>
                        {screenshotPreviewUrl ? (
                          <Box
                            component="img"
                            alt="Selected screenshot preview"
                            src={screenshotPreviewUrl}
                            sx={{
                              aspectRatio: '16 / 10',
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2,
                              maxWidth: 420,
                              objectFit: 'cover',
                              width: '100%',
                            }}
                          />
                        ) : null}
                      </Stack>
                    ) : null}
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end">
                    <Button
                      disabled={busy}
                      onClick={() => void handleSubmit()}
                      size="large"
                      startIcon={busy ? <CircularProgress color="inherit" size={18} /> : <SendOutlined />}
                      sx={{ borderRadius: 999, minWidth: { sm: 180 } }}
                      variant="contained"
                    >
                      {busy ? 'Sending...' : 'Send request'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </AccountHubShell>
      </Container>
    </Box>
  );
}
