import Image from 'next/image';
import Link from 'next/link';

export default function EventSmallBox({ event }: any) {
  return (
    <Link href={`/#`}>
      <div
        className={`
                bg-scale-100 dark:bg-scale-300
                hover:bg-scale-200 hover:dark:bg-scale-400
                group flex h-full w-full flex-col rounded border px-6 
                py-6 shadow 
                transition-all 
                hover:shadow-lg`}
      >
        <div className="w-full">
          <div className="group relative mx-auto h-40 w-full flex-none shadow-lg">
            <Image
              src="/hero-desktop.png"
              width={1000}
              height={760}
              alt="Screenshots of the dashboard project showing desktop version"
            />
            <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <h1>Button Goes Here</h1>
            </div>
          </div>
          <div className="pt-2">
            <div className="block truncate font-bold">{event.title}</div>
            <div>Hosted by: {event.organizers}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
