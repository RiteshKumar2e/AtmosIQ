import type { Metadata } from "next";

import { Reveal } from "@/components/landing/Reveal";
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
      {/* The hero is above the fold, so it renders immediately rather than
          waiting on a scroll observer. */}
      <Hero />

      <Reveal>
        <ProblemSection />
      </Reveal>
      <Reveal>
        <SolutionSection />
      </Reveal>
      <Reveal>
        <IntelligencePreview />
      </Reveal>
      <Reveal>
        <FeaturesPreview />
      </Reveal>
      <Reveal>
        <HowItWorksPreview />
      </Reveal>
      <Reveal>
        <BricsVision />
      </Reveal>
      <Reveal>
        <ImpactSection />
      </Reveal>
      <Reveal>
        <FinalCta />
      </Reveal>
    </PublicShell>
  );
}
