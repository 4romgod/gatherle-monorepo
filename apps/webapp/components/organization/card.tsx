import Link from 'next/link';
import { Box, Button, Card, CardActions, CardContent, Chip, Stack, Typography } from '@mui/material';
import { ROUTES } from '@/lib/constants';

export type OrganizationCardProps = {
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  tags?: string[];
  followersCount?: number;
  isFollowable?: boolean;
};

const OrganizationCard = ({
  name,
  slug,
  description,
  logo,
  tags,
  followersCount,
  isFollowable,
}: OrganizationCardProps) => {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      }}
    >
      {logo ? (
        <Box
          sx={{
            height: 140,
            borderRadius: '18px 18px 0 0',
            backgroundImage: `url(${logo})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        <Box
          sx={{
            height: 140,
            borderRadius: '18px 18px 0 0',
            backgroundColor: 'divider',
          }}
        />
      )}
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
          {isFollowable ? 'Followable collective' : 'Private collective'}
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1, lineHeight: 1.2 }}>
          {name ?? 'Untitled organization'}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2} gap={1}>
          {tags?.slice(0, 4).map(tag => (
            <Chip
              key={tag}
              label={`#${tag}`}
              size="small"
              sx={{
                fontWeight: 500,
                fontSize: '0.75rem',
                textTransform: 'none',
              }}
            />
          ))}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {followersCount ?? 0} followers
        </Typography>
        <Button
          size="small"
          variant="contained"
          component={Link}
          href={slug ? ROUTES.ORGANIZATIONS.ORG(slug) : ROUTES.ORGANIZATIONS.ROOT}
          sx={{ fontWeight: 600, textTransform: 'none' }}
        >
          View
        </Button>
      </CardActions>
    </Card>
  );
};

export default OrganizationCard;
