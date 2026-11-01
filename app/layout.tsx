import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { UIProvider } from "./components/UIProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Belanja Pasar",
  description:
    "Buat daftar belanja, kirim ke tukang sayur, dan pantau harganya.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} min-h-dvh bg-stone-50 font-sans text-stone-900 antialiased`}
      >
        <UIProvider>{children}</UIProvider>
      </body>
    </html>
  );
}
