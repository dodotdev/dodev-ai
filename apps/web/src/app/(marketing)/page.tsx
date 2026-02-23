import { Features } from "@/components/marketing/features"
import { Hero } from "@/components/marketing/hero"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { OpenSource } from "@/components/marketing/open-source"
import { Pricing } from "@/components/marketing/pricing"
import { SocialProof } from "@/components/marketing/social-proof"
import { ToolShowcase } from "@/components/marketing/tool-showcase"
import { Waitlist } from "@/components/marketing/waitlist"

export default function HomePage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <ToolShowcase />
      <Pricing />
      <Waitlist />
      <OpenSource />
    </>
  )
}
