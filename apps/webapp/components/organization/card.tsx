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
    <Card elevation={0} sx={{ borderRadius: 3, minHeight: 220, display: 'flex', flexDirection: 'column' }}>
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
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="overline" color="text.secondary">
          {isFollowable ? 'Followable collective' : 'Private collective'}
        </Typography>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
          {name ?? 'Untitled organization'}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" mt={2} gap={1}>
          {tags?.slice(0, 4).map(tag => (
            <Chip key={tag} label={tag} size="small" />
          ))}
        </Stack>
      </CardContent>
      <CardActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {followersCount ?? 0} followers
        </Typography>
        <Button
          size="small"
          variant="contained"
          component={Link}
          href={slug ? ROUTES.ORGANIZATIONS.ORG(slug) : ROUTES.ORGANIZATIONS.ROOT}
        >
          View
        </Button>
      </CardActions>
    </Card>
  );
};

export default OrganizationCard;
