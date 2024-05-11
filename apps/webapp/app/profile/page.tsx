import CustomTabs, { CustomTabsProps } from '@/components/tabs/custom-tabs';
import { lusitana } from '@/components/theme/fonts';
import { Event, Interests, Message, Notifications } from '@mui/icons-material';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Ntlango',
    template: 'Ntlango',
  },
  icons: {
    icon: '/logo-img.png',
    shortcut: '/logo-img.png',
    apple: '/logo-img.png',
  },
};

const tabsProps: CustomTabsProps = {
  tabsTitle: '',
  tabs: [
    {
      name: 'Events',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Events</h1>,
      icon: <Event fontSize="small" />,
    },
    {
      name: 'Interests',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Interests</h1>,
      icon: <Interests fontSize="small" />,
    },
    {
      name: 'Messages',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Messages</h1>,
      icon: <Message fontSize="small" />,
    },
    {
      name: 'Notifications',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Notifications</h1>,
      icon: <Notifications fontSize="small" />,
    },
  ],
};

export default async function Page() {
  return (
    <main>
      <CustomTabs tabsProps={tabsProps} />
    </main>
  );
}
