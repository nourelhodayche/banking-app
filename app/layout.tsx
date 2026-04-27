import type { Metadata } from "next";
//polices Google (Inter + IBM Plex Serif)
import {Inter, IBM_Plex_Serif, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


//configurer les fonts et tu les attaches à des variables CSS
const inter = Inter({ subsets: ["latin"], variable: '--font-inter'});
const ibmPlexSerif = IBM_Plex_Serif({ 
  subsets:['latin'],
  weight:['400','700'],
  variable: '--font-ibm-plex-serif'
});

//le titre du site la description (SEO),licône (favicon)
export const metadata: Metadata = {
  title: "WalletVision",
  description: "WalletVision is a modern banking platform for everyone.",
  icons:{
  icon: '/icons/logo.svg'
}
};

//le layout principal qui wrap toute ton app
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en" className={cn("font-sans", geist.variable)}>
  <body className={'${inter.variable} ${ibmPlexSerif.variable} ${ibmPlexSerif.variable}'}>{children}</body>
    </html>
  );
}
