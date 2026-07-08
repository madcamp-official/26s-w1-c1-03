import type { Metadata } from "next";
import "@/styles/index.css";

export const metadata: Metadata = {
  title: "Team Evaluation Platform",
  description:
    "Evaluate team members with a unique star-based system showcasing skills and stats, enabling users to form teams and gain insights through AI analysis.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
