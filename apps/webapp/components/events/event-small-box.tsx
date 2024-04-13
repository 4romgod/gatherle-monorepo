import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarIcon,
  CheckCircleIcon,
  TicketIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { Event } from '@/lib/graphql/types/graphql';

export default function EventSmallBox({ event }: { event: Event }) {
  const {
    title,
    organizers,
    startDate,
    rSVPs,
    media: { featuredImageUrl },
  } = event;
  const organizersText =
    organizers?.map((user) => user.username).join(' and ') ?? '';

  return (
    <Link href={`/ntlango`}>
      <div
        className={`
          bg-scale-100 dark:bg-scale-300 hover:bg-scale-200 hover:dark:bg-scale-400
          group flex
          h-full w-full flex-row gap-2
          rounded border
          px-2 py-4
          shadow transition-all hover:shadow-lg
          md:flex-col 
          md:px-0 
          md:py-0
          md:pb-3
        `}
      >
        <div className="w-1/4 pt-1 md:w-full md:pt-0">
          <Image
            src={featuredImageUrl}
            alt="Event Image"
            width={500}
            height={500}
            sizes="100vw"
            style={{
              width: '100%',
              height: 'auto',
            }}
            className="rounded"
          />
        </div>
        <div className="w-3/4 md:w-full md:px-6 md:pt-2">
          <div>
            <h4 className="text-xl font-bold">{title}</h4>
          </div>
          <div className="flex flex-row">
            <UserIcon className="mr-2 h-6 w-5" />
            <p className="text-base">{organizersText}</p>
          </div>
          <div className="flex flex-row">
            <CalendarIcon className="mr-2 h-6 w-5" />
            <p>{startDate}</p>
          </div>
          <div className="flex flex-row">
            <CheckCircleIcon className="mr-2 h-6 w-5" />
            <p>{rSVPs.length ?? 0} RSVP&lsquo;s</p>
          </div>
          <div className="flex flex-row">
            <TicketIcon className="mr-2 h-6 w-5" />
            <p>Free</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
