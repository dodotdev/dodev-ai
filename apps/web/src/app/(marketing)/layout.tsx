import { redirect } from "next/navigation"
import { isSelfHosted } from "@/lib/mode"
import { Footer } from "@/components/marketing/footer"
import { Navbar } from "@/components/marketing/navbar"
import { getUser } from "@/lib/auth"

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  if (isSelfHosted()) redirect("/dashboard")

  const user = await getUser()

  return (
    <>
      <Navbar user={user ? { email: user.email, name: user.name } : null} />
      <main>{children}</main>
      <Footer />
    </>
  )
}
