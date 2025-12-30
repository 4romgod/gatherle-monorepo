import { User } from '@/data/graphql/types/graphql';
import { Avatar, Chip } from '@mui/material';
import Link from 'next/link';

export default function UserChip({ user }: { user: User }) {
  const { profile_picture, username } = user;

  return (
    <Link href={`/users/${username}`} passHref>
      <Chip
        label={username}
        avatar={
          profile_picture ? (
            <Avatar src={profile_picture} alt={username} />
          ) : (
            <Avatar>{username.charAt(0).toLocaleUpperCase()}</Avatar>
          )
        }
      />
    </Link>
  );
}
