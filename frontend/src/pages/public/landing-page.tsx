import { HeroSection } from "@/features/landing/sections/hero-section"
import { StatsSection } from "@/features/landing/sections/stats-section"
import { AboutSection } from "@/features/landing/sections/about-section"
import { CoursesSection } from "@/features/landing/sections/courses-section"
import { FeaturesSection } from "@/features/landing/sections/features-section"
import { TeachersSection } from "@/features/landing/sections/teachers-section"
import { TestimonialsSection } from "@/features/landing/sections/testimonials-section"
import { NewsSection } from "@/features/landing/sections/news-section"
import { GallerySection } from "@/features/landing/sections/gallery-section"
import { ConsultationSection } from "@/features/landing/sections/consultation-section"
import { ContactSection } from "@/features/landing/sections/contact-section"

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <CoursesSection />
      <FeaturesSection />
      <TeachersSection />
      <TestimonialsSection />
      <NewsSection />
      <GallerySection />
      <ConsultationSection />
      <ContactSection />
    </>
  )
}
