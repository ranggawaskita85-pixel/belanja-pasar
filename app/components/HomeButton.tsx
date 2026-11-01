"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUI } from "@/app/components/UIProvider";

/**
 * Tombol logo untuk kembali ke halaman utama.
 * Jika `dirty` true (ada proses yang belum selesai), tampilkan pop-up
 * peringatan dulu. Jika false, berperilaku seperti tautan biasa.
 */
export default function HomeButton({
  href,
  dirty = false,
}: {
  href: string;
  dirty?: boolean;
}) {
  const router = useRouter();
  const { confirm } = useUI();

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!dirty) return; // biarkan Link bekerja normal
    e.preventDefault();
    const ok = await confirm({
      title: "Kembali ke halaman utama?",
      description:
        "Proses yang sedang berjalan akan dibatalkan jika Anda kembali ke halaman utama.",
      confirmLabel: "Ya, batalkan & kembali",
      cancelLabel: "Lanjutkan proses",
      destructive: true,
    });
    if (ok) router.push(href);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label="Kembali ke halaman utama"
      title="Halaman utama"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-emerald-700 active:bg-emerald-900"
    >
      <Image
        src="/icon-192.png"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 rounded-md"
      />
    </Link>
  );
}
