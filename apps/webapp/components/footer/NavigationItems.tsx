import { FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaLinkedin } from 'react-icons/fa';
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
  { icon: <FaFacebook />, href: 'https://facebook.com' },
  { icon: <FaTwitter />, href: 'https://twitter.com' },
  { icon: <FaInstagram />, href: 'https://instagram.com' },
  { icon: <FaYoutube />, href: 'https://youtube.com' },
  { icon: <FaLinkedin />, href: 'https://linkedin.com' },
];
