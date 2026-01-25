import type { Metadata } from 'next';
import { getClient } from '@/data/graphql';
import { GetOrganizationBySlugDocument } from '@/data/graphql/query';
import { Organization } from '@/data/graphql/types/graphql';
import OrganizationPageClient from '@/components/organization/organizationDetailPageClient';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const organizationResult = await getClient().query<{ readOrganizationBySlug: Organization }, { slug: string }>({
      query: GetOrganizationBySlugDocument,
      variables: { slug },
    });
    const organization = organizationResult.data.readOrganizationBySlug;

    if (organization) {
      return {
        title: `${organization.name} · Ntlango`,
        description: organization.description || `Discover events by ${organization.name} on Ntlango.`,
      };
    }
  } catch (error) {
    console.error('Unable to load organization metadata', error);
  }

  return {
    title: 'Organization · Ntlango',
    description: 'Discover organizations powering events on Ntlango.',
  };
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  return <OrganizationPageClient slug={slug} />;
}
