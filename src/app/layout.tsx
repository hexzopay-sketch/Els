import { SidebarProvider } from "@/contexts/SidebarContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/components/ToastPopup";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { RouteGuard } from "@/components/RouteGuard";
import TopLoadingBar from "@/components/TopLoadingBar";
import { AttackProvider } from "@/contexts/AttackContext";
import MainWrapper from "@/components/MainWrapper";
import BroadcastPopup from "@/components/BroadcastPopup";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LevL7 Stresser",
  description: "High-Performance IP Stresser & Load Testing Tool",
  icons: "imagens/logo.png"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text font-sans">
        <AuthProvider>
          <TopLoadingBar />
          <BroadcastPopup />
          <ToastProvider>
            <SidebarProvider>
              <RouteGuard>
                <AttackProvider>
                  <LayoutContent>{children}</LayoutContent>
                </AttackProvider>
              </RouteGuard>
            </SidebarProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <Sidebar />
      <MainWrapper>{children}</MainWrapper>
    </>
  );
}