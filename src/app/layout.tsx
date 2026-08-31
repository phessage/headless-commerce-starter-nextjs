import type { Metadata } from "next";
import "./styles.css";
import "./checkout.css";
export const metadata: Metadata = {
  title: "Trailhead Demo Store",
  description: "1Ecomm headless commerce reference storefront",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
