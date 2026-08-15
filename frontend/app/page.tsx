import type { Metadata } from "next";

import { ImpactSection, IntelligencePreview } from "@/components/landing/live";
import {
  BricsVision,
  FeaturesPreview,
  FinalCta,
  Hero,
  HowItWorksPreview,
  ProblemSection,
  SolutionSection,
} from "@/components/landing/sections";
import { PublicShell } from "@/components/navigation/PublicShell";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
};

export default function HomePage() {
  return (
    <PublicShell>
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <IntelligencePreview />
      <FeaturesPreview />
      <HowItWorksPreview />
      <BricsVision />
      <ImpactSection />
      <FinalCta />
    </PublicShell>
  );
}
