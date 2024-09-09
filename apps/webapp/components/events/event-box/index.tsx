'use client';

import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import { IconButton, Typography } from '@mui/material';
import { EventType } from '@/data/graphql/types/graphql';
import { Box } from '@mui/material';
import { CalendarIcon, CheckCircleIcon, TicketIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { ShareRounded, ThumbUpOffAltOutlined } from '@mui/icons-material';
import { RRule } from 'rrule';

export default function EventBox({ event }: { event: EventType }) {
    const { title, recurrenceRule, rSVPList, media } = event;

    return (
        <Card
            sx={{
                p: 2,
                display: 'flex',
                backgroundColor: 'inherit',
                boxShadow: "0",
                borderRadius: '18px',
                ':hover': {
                    boxShadow: '0 0 11px rgba(33,33,33,.2)',
                },
                flexDirection: { xs: 'column', sm: 'row' },
                height: '100%',
                position: 'relative',
            }}
        >
            {media && media.featuredImageUrl && (
                <CardMedia
                    component="img"
                    image={media.featuredImageUrl}
                    alt={title}
                    sx={{
                        width: { xs: '100%', sm: 230, lg: 240, xl: 270 },
                        height: { xs: 180, sm: 120, lg: 130, xl: 150 },
                        borderRadius: '12px',
                        mb: { xs: 2, sm: 0 },
                    }}
                />
            )}
            <Box component="div">
                <Box sx={{ alignSelf: 'center', ml: { sm: 2 } }}>
                    <Typography variant="h6" color="text.secondary">{title}</Typography>

                    <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
                        <CalendarIcon height={20} width={20} />
                        <Typography variant='subtitle2' paddingLeft={1}>{RRule.fromString(recurrenceRule).toText()}</Typography>
                    </Box>

                    <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
                        <CheckCircleIcon height={20} width={20} />
                        <Typography variant='subtitle2' paddingLeft={1}>{rSVPList.length ?? 0} RSVP&lsquo;s</Typography>
                    </Box>

                    <Box component="div" sx={{ display: 'flex', flexDirection: 'row', marginTop: 1 }}>
                        <TicketIcon height={20} width={20} />
                        <Typography variant='subtitle2' paddingLeft={1}>Free</Typography>
                    </Box>
                </Box>

                <Box component="div" sx={{ position: 'absolute', bottom: 16, right: 16 }}>
                    <IconButton size="small" sx={{ mr: 1 }}>
                        <ShareRounded />
                    </IconButton>
                    <IconButton size="small" sx={{ mr: 1 }}>
                        <ThumbUpOffAltOutlined height={20} width={20} />
                    </IconButton>
                    <IconButton size="small" sx={{ mr: 1 }}>
                        <EllipsisHorizontalIcon height={30} width={30} />
                    </IconButton>
                </Box>
            </Box>
        </Card>
    )
};
