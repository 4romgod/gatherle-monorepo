import 'reflect-metadata';
import { Field, Int, ObjectType } from 'type-graphql';

@ObjectType('AdminDashboardStats', { description: 'High-level counts used on the admin dashboard.' })
export class AdminDashboardStats {
  @Field(() => Int, { description: 'Total number of events in the system.' })
  totalEvents: number;

  @Field(() => Int, { description: 'Number of events currently in Draft state.' })
  draftEvents: number;

  @Field(() => Int, { description: 'Number of events that are Published.' })
  publishedEvents: number;

  @Field(() => Int, { description: 'Number of events that are scheduled as Upcoming.' })
  upcomingEvents: number;

  @Field(() => Int, { description: 'Number of events that have been Cancelled.' })
  cancelledEvents: number;

  @Field(() => Int, { description: 'Total number of event categories.' })
  totalCategories: number;

  @Field(() => Int, { description: 'Total number of event category groups.' })
  totalCategoryGroups: number;

  @Field(() => Int, { description: 'Total number of registered users.' })
  totalUsers: number;

  @Field(() => Int, { description: 'Users with the Admin role.' })
  adminUsers: number;

  @Field(() => Int, { description: 'Users with the Host role.' })
  hostUsers: number;
}
