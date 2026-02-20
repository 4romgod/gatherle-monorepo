import type { Metadata } from 'next';
import { getClient } from '@/data/graphql';
import { GetOrganizationBySlugDocument } from '@/data/graphql/query';
import { Organization } from '@/data/graphql/types/graphql';
import OrganizationPageClient from '@/components/organization/organizationDetailPageClient';
import { buildPageMetadata } from '@/lib/metadata';

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
      return buildPageMetadata({
        title: organization.name,
        description: organization.description || `Discover events hosted by ${organization.name} on Gatherle.`,
        keywords: [organization.name, 'organization events', 'community organizers'],
      });
    }
  } catch (error) {
    console.error('Unable to load organization metadata', error);
  }

  return buildPageMetadata({
    title: 'Organization',
    description: 'Discover organizations powering events and communities on Gatherle.',
    keywords: ['organizations', 'event organizers', 'community groups'],
  });
}

export default async function OrganizationPage({ params }: Props) {
  const { slug } = await params;
  return <OrganizationPageClient slug={slug} />;
}
