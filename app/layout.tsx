import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { GlobalSiteHeader } from "@/ui/components/global-site-header";
import { ProjectConfigProvider } from "@/ui/providers/project-config-provider";

export const metadata: Metadata = {
  title: "ContractFlow",
  description: "Convert C# or JSON into TypeScript contracts, Angular services, and JSON mocks.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg", type: "image/svg+xml" }]
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ProjectConfigProvider>
          <GlobalSiteHeader />
          <div className="pt-16">{children}</div>
        </ProjectConfigProvider>
      </body>
    </html>
  );
}
