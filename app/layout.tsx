import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://playground.opsv.dev"),
  title: { default: "OPSV Playground — Bygg. Bryt. Testa. Lär.", template: "%s / OPSV Playground" },
  description: "En öppen lekplats för AI, kod och experiment från den svenska OPSV-gemenskapen.",
  openGraph: { title: "OPSV Playground", description: "Bygg. Bryt. Testa. Lär.", type: "website", locale: "sv_SE" },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { themeColor: "#11110f", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="sv"><body><a className="skip-link" href="#content">Hoppa till innehållet</a><SiteHeader/><main id="content">{children}</main><SiteFooter/></body></html>;
}
