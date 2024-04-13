import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { lusitana } from '@/components/theme/fonts';

export default function NtlangoLogo() {
  return (
    <div
      className={`${lusitana.className} flex flex-row items-center leading-none text-white`}
    >
      <CalendarDaysIcon className="h-12 w-12 rotate-[15deg]" />
      <p className="text-[44px]">Ntlango</p>
    </div>
  );
}
