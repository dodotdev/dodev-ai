import { ComingSoon } from "@/components/marketing/coming-soon"
import { Features } from "@/components/marketing/features"
import { Hero } from "@/components/marketing/hero"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { Pricing } from "@/components/marketing/pricing"
import { SeeItInAction } from "@/components/marketing/see-it-in-action"
import { SocialProof } from "@/components/marketing/social-proof"
import { Waitlist } from "@/components/marketing/waitlist"

export default function HomePage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <SeeItInAction />
      <HowItWorks />
      <Pricing />
      <ComingSoon />
      <Waitlist />
    </>
  )
}
