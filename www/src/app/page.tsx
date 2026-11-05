"use client";

import React from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { WhoUsesWeaveSection } from "@/components/WhoUsesWeaveSection";
import { ThesisSection } from "@/components/ThesisSection";
import { ComparisonLedger } from "@/components/ComparisonLedger";
import { MetricsSection } from "@/components/MetricsSection";
import { GovernanceSection } from "@/components/GovernanceSection";
import { WorkflowShowcaseSection } from "@/components/WorkflowShowcaseSection";
import { FinalCtaSection } from "@/components/FinalCtaSection";
import { Footer } from "@/components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-cloud-50 text-umber-800 dark:bg-umber-900 dark:text-cloud-50">
      <Navbar />
      <HeroSection />
      <WhoUsesWeaveSection />
      <ThesisSection />
      <ComparisonLedger />
      <MetricsSection />
      <GovernanceSection />
      <WorkflowShowcaseSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}
