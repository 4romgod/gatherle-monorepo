import { Box, IconButton, Stack, Typography } from '@mui/material';
import { LinkRounded } from '@mui/icons-material';
import { FaEnvelope, FaFacebookF, FaWhatsapp } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { launchExternalShare, type PlatformAction } from './share-utils';

interface SharePlatformBarProps {
  eventTitle: string;
  resolvedEventUrl: string;
  onCopyLink: () => void;
}

function buildPlatformActions(eventTitle: string, resolvedEventUrl: string, onCopyLink: () => void): PlatformAction[] {
  const encodedUrl = encodeURIComponent(resolvedEventUrl);
  const encodedSummary = encodeURIComponent(`Check out this event: ${eventTitle}`);
  const encodedWhatsAppText = encodeURIComponent(`Check out this event: ${eventTitle}\n${resolvedEventUrl}`);

  return [
    {
      key: 'copy',
      label: 'Copy link',
      muiIcon: <LinkRounded fontSize="small" />,
      bgColor: 'text.secondary',
      fgColor: 'background.paper',
      onClick: onCopyLink,
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: FaWhatsapp,
      bgColor: 'success.main',
      fgColor: 'success.contrastText',
      onClick: () => launchExternalShare(`https://wa.me/?text=${encodedWhatsAppText}`),
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: FaFacebookF,
      bgColor: 'info.main',
      fgColor: 'info.contrastText',
      onClick: () => launchExternalShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
    },
    {
      key: 'x',
      label: 'X',
      icon: FaXTwitter,
      bgColor: 'text.primary',
      fgColor: 'background.paper',
      onClick: () => launchExternalShare(`https://x.com/intent/tweet?text=${encodedSummary}&url=${encodedUrl}`),
    },
    {
      key: 'email',
      label: 'Email',
      icon: FaEnvelope,
      bgColor: 'text.secondary',
      fgColor: 'background.paper',
      onClick: () =>
        launchExternalShare(
          `mailto:?subject=${encodeURIComponent(eventTitle)}&body=${encodeURIComponent(
            `Check out this event:\n${eventTitle}\n${resolvedEventUrl}`,
          )}`,
        ),
    },
  ];
}

export default function SharePlatformBar({ eventTitle, resolvedEventUrl, onCopyLink }: SharePlatformBarProps) {
  const actions = buildPlatformActions(eventTitle, resolvedEventUrl, onCopyLink);

  return (
    <Box
      sx={{
        px: 2,
        pt: 1.25,
        pb: 1.75,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.default',
        overflowX: 'auto',
      }}
    >
      <Stack direction="row" spacing={1.25}>
        {actions.map((action) => {
          const BrandIcon = action.icon;
          return (
            <Box
              key={action.key}
              sx={{
                width: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexShrink: 0,
              }}
            >
              <IconButton
                onClick={action.onClick}
                aria-label={action.label}
                sx={{
                  width: 46,
                  height: 46,
                  mx: 'auto',
                  color: action.fgColor,
                  backgroundColor: action.bgColor,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    opacity: 0.9,
                    backgroundColor: action.bgColor,
                  },
                }}
              >
                {BrandIcon ? <BrandIcon size={18} /> : action.muiIcon}
              </IconButton>
              <Typography
                variant="caption"
                sx={{
                  mt: 0.55,
                  color: 'text.secondary',
                  lineHeight: 1.15,
                  minHeight: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  width: '100%',
                  whiteSpace: 'nowrap',
                }}
              >
                {action.label}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
