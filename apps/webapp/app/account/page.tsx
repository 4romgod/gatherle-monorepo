import CustomTabs, { CustomTabsProps } from '@/components/tabs/custom-tabs';
import { lusitana } from '@/components/theme/fonts';
import { Person, PersonOutlined, ManageAccounts, Payment, Interests, Event, PermMedia } from '@mui/icons-material';
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
      name: 'Edit Profile',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Edit Profile</h1>,
      icon: <PersonOutlined fontSize="small" />,
    },
    {
      name: 'Personal',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Personal</h1>,
      icon: <Person fontSize="small" />,
    },
    {
      name: 'Interests',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Interests</h1>,
      icon: <Interests fontSize="small" />,
    },
    {
      name: 'Events',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Events</h1>,
      icon: <Event fontSize="small" />,
    },
    {
      name: 'Account',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Account</h1>,
      icon: <ManageAccounts fontSize="small" />,
    },
    {
      name: 'Payments',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Payments</h1>,
      icon: <Payment fontSize="small" />,
    },
    {
      name: 'Social Media',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Social Media</h1>,
      icon: <PermMedia fontSize="small" />,
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
