import React, { useState } from 'react';
import { saveContactInquiry } from '../../services/firebase';

export const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    topic: 'Bottleneck & Root Cause Intelligence',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await saveContactInquiry(formData);
    } catch (err) {
      console.warn('Firestore inquiry error:', err);
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <section id="contact" className="py-20 lg:py-28 relative border-t border-white/5 bg-[#0a101d]/80 industrial-grid">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-cyan-500/30 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>DIRECT INDUSTRIAL SUPPORT</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            Contact Us.
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Connect directly with our manufacturing systems engineers to evaluate line telemetry, pilot deployments, or custom factory topologies.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Direct Contact & Engineering Specs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-950/80 border border-white/10 space-y-4">
              <h3 className="text-xl font-bold font-heading text-white flex items-center gap-2">
                <span>Enterprise Engineering Inquiries</span>
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Whether you operate discrete manufacturing, high-speed assembly, or process lines, ForgeMind AI integrates non-intrusively with existing factory telemetry.
              </p>
              
              <div className="pt-4 border-t border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                    ✉
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DIRECT CHANNEL</span>
                    <a href="mailto:contact@forgemind.ai" className="text-cyan-300 hover:underline">
                      contact@forgemind.ai
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    ⏱
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">ENGINEERING SLA</span>
                    <span className="text-slate-200">Response within 24 business hours</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-300">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                    🛡
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">DEPLOYMENT FLEXIBILITY</span>
                    <span className="text-slate-200">On-Premises Edge & Private Cloud</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Industrial Integration Callout */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-950/20 border border-cyan-500/20 space-y-2">
              <div className="flex items-center gap-2">
                <span className="tag-measured text-[9px]">[COMPATIBILITY]</span>
                <span className="text-xs font-semibold text-white">Non-Intrusive Connectivity</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Native ingestion support for standard CSV time-series, OPC-UA tags, MQTT message brokers, and relational operational stores (PostgreSQL / TimescaleDB).
              </p>
            </div>
          </div>

          {/* Right Column: Contact Form */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-3xl bg-slate-950/90 border border-cyan-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,229,255,0.08)]">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 text-2xl shadow-[0_0_20px_rgba(0,230,118,0.3)]">
                    ✓
                  </div>
                  <h3 className="text-2xl font-bold font-heading text-white">Inquiry Received</h3>
                  <p className="text-slate-300 max-w-md mx-auto text-sm leading-relaxed">
                    Thank you, <span className="text-cyan-400 font-semibold">{formData.fullName || 'Engineer'}</span>. Your inquiry has been routed to our industrial solutions engineering team. We will review your plant parameters and respond within 24 hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ fullName: '', email: '', company: '', topic: 'Bottleneck & Root Cause Intelligence', message: '' });
                    }}
                    className="px-5 py-2 text-xs font-mono text-cyan-300 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/10 transition"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Full Name <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Jordan Vance"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Corporate / Work Email <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="jordan.vance@manufacturing.com"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-company" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Company & Plant Location <span className="text-cyan-400">*</span>
                      </label>
                      <input
                        id="contact-company"
                        type="text"
                        required
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Apex Assembly Works, Plant 3"
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-topic" className="block text-xs font-medium text-slate-300 mb-1.5">
                        Primary Area of Interest
                      </label>
                      <select
                        id="contact-topic"
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className="w-full bg-slate-900 border border-white/15 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition cursor-pointer"
                      >
                        <option value="Bottleneck & Root Cause Intelligence">Bottleneck & Root Cause Intelligence</option>
                        <option value="Visual Inspection & Defect Screening">Visual Inspection & Defect Screening</option>
                        <option value="What-If Factory Simulator Evaluation">What-If Factory Simulator Evaluation</option>
                        <option value="Production Economic Quantification">Production Economic Quantification</option>
                        <option value="Full Enterprise Platform Pilot">Full Enterprise Platform Pilot</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-medium text-slate-300 mb-1.5">
                      Operational Context / Details <span className="text-cyan-400">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Describe your current line arrangement, cycle-time challenges, or telemetry integration needs..."
                      className="w-full bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 rounded-xl shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:shadow-[0_0_30px_rgba(0,229,255,0.55)] transition-all font-heading disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Saving Inquiry to Firestore Database...</span>
                      </>
                    ) : (
                      <span>Submit Engineering Inquiry</span>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-slate-500 font-mono">
                    All industrial inquiries handled with mutual NDA protocols.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
