"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { MethodsSection } from "@/components/home/MethodsSection";
import { PriceSection } from "@/components/home/PriceSection";
import { FAQSection } from "@/components/home/FaqSection";
import { Footer } from "@/components/home/Footer";

export default function Home() {
  const { isLogged, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted || isLoading) return null;

  if (isLogged) {
    router.replace("/dashboard");
    return null;
  }

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <MethodsSection />
      <PriceSection />
      <FAQSection />
      <Footer />
    </>
  );
}
