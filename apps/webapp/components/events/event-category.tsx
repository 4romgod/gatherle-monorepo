'use client';

import { EventCategory } from '@/lib/graphql/types/graphql';
import { ICON_MAPPING } from '@/lib/constants';

export default function EventCategoryComponent({
  eventCategory,
}: {
  eventCategory: EventCategory;
}) {
  const IconComponent = ICON_MAPPING[eventCategory.iconName];

  return (
    <div className="flex items-center space-x-2">
      <IconComponent className="h-6 w-6" />
      <p>{eventCategory.name}</p>
    </div>
  );
}
