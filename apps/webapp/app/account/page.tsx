import CustomTabs, { CustomTabsProps } from '@/components/tabs/custom-tabs';
import { lusitana } from '@/components/theme/fonts';
import { Person, PersonOutlined, ManageAccounts, Payment } from '@mui/icons-material';
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
      name: 'Account Management',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Account Management</h1>,
      icon: <ManageAccounts fontSize="small" />,
    },
    {
      name: 'Payments',
      content: <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>Payments</h1>,
      icon: <Payment fontSize="small" />,
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
