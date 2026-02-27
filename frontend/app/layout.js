import "./globals.css";

export const metadata = {
  title: "Wellbore Profile | Phase 1",
  description: "Interactive 3D well trajectory viewer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
