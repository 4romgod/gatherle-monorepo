import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLinkedin } from 'react-icons/fa';
import { ROUTES } from '@/lib/constants/routes';

// TODO Created pages for all these routes
export const footerSections = [
  {
    title: 'Your Account',
    links: [
      { name: 'Sign up', href: ROUTES.AUTH.REGISTER },
      { name: 'Log in', href: ROUTES.AUTH.LOGIN },
      { name: 'Help', href: '#' },
      { name: 'Settings', href: '/settings' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { name: 'Groups', href: '/groups' },
      { name: 'Calendar', href: '/calendar' },
      { name: 'Topics', href: '/topics' },
      { name: 'Cities', href: '/cities' },
    ],
  },
  {
    title: 'About',
    links: [
      { name: 'About us', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Press', href: '/press' },
    ],
  },
  {
    title: 'More',
    links: [
      { name: 'API', href: '/api' },
      { name: 'Terms of Service', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

export const socialLinks = [
  { icon: <FaFacebook />, href: 'https://facebook.com' },
  { icon: <FaTwitter />, href: 'https://twitter.com' },
  { icon: <FaInstagram />, href: 'https://instagram.com' },
  { icon: <FaYoutube />, href: 'https://youtube.com' },
  { icon: <FaLinkedin />, href: 'https://linkedin.com' },
];
