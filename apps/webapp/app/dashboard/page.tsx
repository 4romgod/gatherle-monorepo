import { lusitana } from '@/components/fonts';
import { getClient } from '@/lib/graphql/apollo-client';
import { readEvents, readUsers } from '@/lib/graphql/queries';
import LatestInvoices from '@/components/dashboard/latest-invoices';

export default async function Page() {
  const { data: users } = await getClient().query({ query: readUsers });

  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* <Card title="Collected" value={totalPaidInvoices} type="collected" /> */}
        {/* <Card title="Pending" value={totalPendingInvoices} type="pending" /> */}
        {/* <Card title="Total Invoices" value={numberOfInvoices} type="invoices" /> */}
        {/* <Card
          title="Total Customers"
          value={numberOfCustomers}
          type="customers"
        /> */}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        {/* <RevenueChart revenue={revenue}  /> */}
        <LatestInvoices users={users.readUsers} />
      </div>
    </main>
  );
}
