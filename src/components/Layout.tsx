import { lazy, Suspense } from "react";
import MinimalHeader from "@/components/MinimalHeader";

const Navigation = lazy(() => import("@/components/Navigation"));

type LayoutProps = { children: React.ReactNode };

/** Wraps page content with nav that loads after first paint (defers Firebase). */
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <Suspense fallback={<MinimalHeader />}>
        <Navigation />
      </Suspense>
      {children}
    </div>
  );
}
