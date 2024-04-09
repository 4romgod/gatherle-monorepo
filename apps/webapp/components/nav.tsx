import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="bg-scale-300 w-full border-b p-4">
      <Link href="https://supabase.com/">
        <div className="flex">
          <h1>Logo Goes here</h1>
        </div>
      </Link>
    </nav>
  );
}
