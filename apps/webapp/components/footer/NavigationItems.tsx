import { FaInstagram, FaLinkedin, FaTiktok } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { ROUTES } from '@/lib/constants/routes';

export const footerSections = [
  {
    title: 'Your Account',
    links: [
      { name: 'Sign up', href: ROUTES.AUTH.REGISTER },
      { name: 'Log in', href: ROUTES.AUTH.LOGIN },
      { name: 'Help', href: '#' },
    ],
  },
  {
    title: 'About',
    links: [
      { name: 'About us', href: '#' },
      { name: 'Blog', href: '#' },
      { name: 'Careers', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms of Service', href: '#' },
      { name: 'Privacy Policy', href: '#' },
      { name: 'Cookie Policy', href: '#' },
    ],
  },
];

export const socialLinks = [
  { name: 'Instagram', icon: <FaInstagram />, href: 'https://www.instagram.com/gatherleofficial' },
  { name: 'TikTok', icon: <FaTiktok />, href: 'https://www.tiktok.com/@gatherle' },
  { name: 'LinkedIn', icon: <FaLinkedin />, href: 'https://www.linkedin.com/company/gatherle' },
  { name: 'X', icon: <FaXTwitter />, href: 'https://x.com/getgatherle' },
];
