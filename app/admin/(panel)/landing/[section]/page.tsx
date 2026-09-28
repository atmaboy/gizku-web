'use client'
import { use } from 'react'
import { EmptyState, TrackedLink } from '@/components/admin/ui'
import { FileQuestion } from 'lucide-react'
import CtaForm from '@/components/admin/landing/forms/CtaForm'
import FaqForm from '@/components/admin/landing/forms/FaqForm'
import FeaturesForm from '@/components/admin/landing/forms/FeaturesForm'
import FooterForm from '@/components/admin/landing/forms/FooterForm'
import HeaderForm from '@/components/admin/landing/forms/HeaderForm'
import HeroForm from '@/components/admin/landing/forms/HeroForm'
import HowItWorksForm from '@/components/admin/landing/forms/HowItWorksForm'
import StatsForm from '@/components/admin/landing/forms/StatsForm'
import TestimonialsForm from '@/components/admin/landing/forms/TestimonialsForm'
import { sectionFromSlug, type BuilderSection } from '@/lib/landing/schema'

const FORMS: Record<BuilderSection, () => React.ReactNode> = {
  header: HeaderForm,
  hero: HeroForm,
  stats: StatsForm,
  howItWorks: HowItWorksForm,
  features: FeaturesForm,
  testimonials: TestimonialsForm,
  faq: FaqForm,
  cta: CtaForm,
  footer: FooterForm,
}

export default function LandingSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params)
  const key = sectionFromSlug(section)
  if (!key) {
    return <EmptyState icon={FileQuestion} title="Section tidak ditemukan" action={<TrackedLink href="/admin/landing/hero" className="text-link underline">Buka Hero</TrackedLink>} />
  }
  const Form = FORMS[key]
  return <Form />
}
