import EventAdvertBox from '@/components/events/event-advert-box';
import EventTileGrid from '@/components/events/event-tile-grid';
import SectionContainer from '@/components/section-container';
import EventCategoryComponent from '@/components/events/event-category';
import Footer from '@/components/footer';
import Navbar from '@/components/navigation/navbar';
import SearchBox from '@/components/search/search-box';
import { groupEventsByCategory } from '@/lib/utils/dataManipulation';
import { getClient } from '@/lib/graphql/apollo-client';
import {
  EventCategory,
  GetAllEventCategoriesDocument,
  GetAllEventsDocument,
} from '@/lib/graphql/types/graphql';

export default async function Home() {
  const { data: events } = await getClient().query({
    query: GetAllEventsDocument,
  });
  const { data: eventCategories } = await getClient().query({
    query: GetAllEventCategoriesDocument,
  });

  const allCategories: EventCategory[] = eventCategories.readEventCategories;

  const eventsByCategory = groupEventsByCategory(events);

  return (
    <>
      <Navbar />
      <SectionContainer className="space-y-16">
        <div className="px-2 text-center">
          <h1 className="text-5xl">Let&apos;s Go!</h1>
          <h2 className="text-2xl">Find The Events You Like</h2>
        </div>

        <div className="px-3 sm:px-0 md:hidden">
          <SearchBox placeholder="Search events..." />
        </div>

        <div className="grid space-y-12 md:gap-8 lg:grid-cols-12 lg:gap-16 lg:space-y-0 xl:gap-16">
          <div className="px-3 sm:px-0 lg:col-span-4 xl:col-span-3">
            <div className="space-y-6">
              <div className="hidden lg:block">
                <h2 className="mb-3 mt-16 px-2 text-2xl sm:px-0">Categories</h2>
                <div className="space-y-1">
                  {allCategories.map((category) => (
                    <EventCategoryComponent
                      key={category.id}
                      eventCategory={category}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="text-scale-900 mb-2 text-sm">Explore more</div>
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1">
                  <EventAdvertBox
                    title="Experts"
                    color="blue"
                    description="Explore our certified Supabase agency experts that build with Supabase"
                    href={`/partners/experts`}
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    }
                  />

                  <EventAdvertBox
                    href={`/partners/integrations#become-a-partner`}
                    title="Become a partner"
                    color="brand"
                    description="Fill out a quick 30 second form to apply to become a partner"
                    icon={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="grid space-y-10">
              {events?.readEvents?.length ? (
                <EventTileGrid eventsByCategory={eventsByCategory} />
              ) : (
                <h2 className="h2">No Partners Found</h2>
              )}
            </div>
          </div>
        </div>
      </SectionContainer>
      <Footer />
    </>
  );
}
