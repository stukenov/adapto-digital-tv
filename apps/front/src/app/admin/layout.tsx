import type { Metadata } from "next";
import AdminTopBar from '@/components/admin/AdminTopBar';

export const metadata: Metadata = {
  title: {
    default: "Админ-панель",
    template: "%s — Админ-панель",
  },
  description: "Административная панель Adapto Digital TV",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="min-h-screen bg-gray-50">
      <AdminTopBar />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </section>
  );
}


