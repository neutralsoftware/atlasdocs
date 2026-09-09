import { RootProvider } from "fumadocs-ui/provider/next";
import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./global.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.atlasengine.org"),
  title: {
    default: "Atlas Engine Documentation",
    template: "%s — Atlas Engine Documentation",
  },
  description:
    "Documentation, tutorials and API reference for the Atlas open-source C++ game engine.",
  applicationName: "Atlas Engine Documentation",
  authors: [
    {
      name: "Neutral Software",
      url: "https://github.com/neutralsoftware",
    },
  ],
  creator: "Neutral Software",
  publisher: "Neutral Software",
  openGraph: {
    title: "Atlas Engine Documentation",
    description:
      "Documentation, tutorials and API reference for the Atlas open-source C++ game engine.",
    siteName: "Atlas Engine Documentation",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Atlas Engine Documentation",
    description:
      "Documentation, tutorials and API reference for the Atlas open-source C++ game engine.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
