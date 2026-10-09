import { createFileRoute } from "@tanstack/react-router";
import { DemoProvider } from "@/components/landing/demo-dialog";
import { Navigation } from "@/components/landing/navigation";
import { Hero } from "@/components/landing/hero";
import { IntelligenceLoop, OpeningStatement, PlatformOverview } from "@/components/landing/story";
import {
  AudienceSection, FinalCTA, Footer, InstitutionSection, IntelligenceVisualization,
  PlacementIntelligence, PlatformPrinciples, StudentJourney,
} from "@/components/landing/sections";

const TITLE = "Ziphyrus X — Make employability measurable";
const DESC = "College employability intelligence: connect learning, coding, assessments, skills and placement readiness in one evidence-driven system.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <DemoProvider>
      <Navigation />
      <main>
        <Hero />
        <OpeningStatement />
        <PlatformOverview />
        <IntelligenceLoop />
        <AudienceSection />
        <StudentJourney />
        <IntelligenceVisualization />
        <PlacementIntelligence />
        <InstitutionSection />
        <PlatformPrinciples />
        <FinalCTA />
      </main>
      <Footer />
    </DemoProvider>
  );
}
