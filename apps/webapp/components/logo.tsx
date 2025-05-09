import { useRouter } from 'next/navigation';

export default function Logo() {
  const router = useRouter();

  return (
    <a style={{ alignItems: 'center', display: 'flex', justifyContent: 'center' }} onClick={() => router.push('/')}>
      <img
        src="logo-img.png"
        alt="logo"
        style={{
          height: '40px',
          width: '40px',
          marginRight: '10px',
          cursor: 'pointer',
        }}
      />
    </a>
  );
}
