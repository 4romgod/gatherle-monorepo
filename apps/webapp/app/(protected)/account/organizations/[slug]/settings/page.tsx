import OrganizationSettingsClient from '@/components/organization/OrganizationSettingsClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export const metadata: Metadata = {
  title: 'Organization Settings · Ntlango',
};

export default async function OrganizationSettingsPage({ params }: Props) {
  const { slug } = await params;
  return <OrganizationSettingsClient slug={slug} />;
}
