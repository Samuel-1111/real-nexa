import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NEXA — Your Personal Assistant", description: "Organize. Plan. Achieve." };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}