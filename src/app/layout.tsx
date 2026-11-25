import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResolVamos · Mesa de ayuda ERP",
  description: "Solicitudes y soporte interno del ERP de Cimbrados.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
