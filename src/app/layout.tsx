import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ely's Salón",
  description: "Sistema POS para Ely's Salón de Belleza",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
