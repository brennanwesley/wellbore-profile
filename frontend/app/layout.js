import "./globals.css";

export const metadata = {
  title: "View Your Wellbore",
  description: "Professional wellbore and subsurface visualization for single-well and future multi-well DSU review.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
