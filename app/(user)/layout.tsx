import type { Metadata } from "next";

// Account, checkout and order pages are private: keep them out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <main className="user-main">{children}</main>;
}
