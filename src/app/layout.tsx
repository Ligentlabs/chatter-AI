import { Analytics } from '@vercel/analytics/react';
import { Metadata } from 'next';
import { PropsWithChildren } from 'react';

import Layout from '@/layout';

export const metadata: Metadata = {
  manifest: '/manifest.json',
  title: 'LobeChat',
};

const RootLayout = ({ children }: PropsWithChildren) => (
  <html lang="en">
    <body>
      <Layout>{children}</Layout>
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
