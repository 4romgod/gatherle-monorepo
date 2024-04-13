import '@/components/global.css';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import { inter } from '@/components/theme/fonts';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/components/theme/theme';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <AppRouterCacheProvider>
        <ThemeProvider theme={theme}>
          <body>{children}</body>
        </ThemeProvider>
      </AppRouterCacheProvider>
    </html>
  );
}
