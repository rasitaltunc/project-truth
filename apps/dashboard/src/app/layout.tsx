import "./globals.css";

// Root layout — passes through to [locale]/layout.tsx
// CSS must be imported here (root level) for Next.js to process it
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
