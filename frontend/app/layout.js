import "./globals.css";

export const metadata = {
  title: "Mumbai Fresh Market",
  description: "A minimal local store e-commerce website built with Next.js and Express."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
