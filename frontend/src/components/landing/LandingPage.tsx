import React from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { ProblemSection } from './ProblemSection';
import { PipelineSection } from './PipelineSection';
import { CapabilitiesSection } from './CapabilitiesSection';
import { WhatIfSimulatorSection } from './WhatIfSimulatorSection';
import { TrustSection } from './TrustSection';
import { ContactSection } from './ContactSection';
import { FinalCTASection } from './FinalCTASection';
import { Footer } from './Footer';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'signin' | 'signup') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth }) => {
  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Navbar */}
      <Navbar
        onSignIn={() => onNavigateToAuth('signin')}
        onSignUp={() => onNavigateToAuth('signup')}
      />

      {/* 2. Hero Section (Clean Centered Layout) */}
      <HeroSection
        onSignIn={() => onNavigateToAuth('signin')}
        onSignUp={() => onNavigateToAuth('signup')}
      />

      {/* 3. Problem Section */}
      <ProblemSection />

      {/* 4. ForgeMind Pipeline */}
      <PipelineSection />

      {/* 5. Capabilities Section */}
      <CapabilitiesSection />

      {/* 6. Hero Feature: What-If Simulator */}
      <WhatIfSimulatorSection />

      {/* 7. Trust / Explainability Section */}
      <TrustSection />

      {/* 8. Contact Us Section (Above the Footer) */}
      <ContactSection />

      {/* 9. Final Enterprise Call to Action */}
      <FinalCTASection
        onSignIn={() => onNavigateToAuth('signin')}
        onSignUp={() => onNavigateToAuth('signup')}
      />

      {/* 10. Clean Industrial Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;
