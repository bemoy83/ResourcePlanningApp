import type { ReactNode } from "react";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

export const dynamic = "force-dynamic";

export default function RootLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <ThemeProvider>{children}</ThemeProvider>
            </body>
        </html>
    );
}
