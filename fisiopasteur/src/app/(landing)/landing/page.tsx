import Header from '@/componentes/landing/Header';
import HeroSection from '@/componentes/landing/HeroSection';
import FeaturesSection from '@/componentes/landing/FeaturesSection';
import PricingSection from '@/componentes/landing/PricingSection';
import FunctionalitiesSection from '@/componentes/landing/FunctionalitiesSection';
import ClientsSection from '@/componentes/landing/ClientsSection';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <FunctionalitiesSection />
      <PricingSection />
      <ClientsSection />
    </div>
  );
}