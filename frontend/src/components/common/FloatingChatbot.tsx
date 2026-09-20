import React, { useState, useEffect, useRef } from 'react';
import { getInspectionById } from '../../services/inspectionStore';

interface ChatSource {
  source_type?: string;
  source_name?: string;
  doc_id?: string;
  section?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  tags?: string[];
  sources?: ChatSource[];
}

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [input, setInput] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('forgemind_floating_chat');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'msg-init',
        sender: 'assistant',
        text: 'Greetings, Engineer. I am your ForgeMind Factory Assistant, available across all sections. Ask me anything regarding defect diagnostics, FMEA root-cause hypotheses, SOP procedures, or Cure & Prevention case tracking.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tags: ['[DECISION SUPPORT]', '[FMEA]'],
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save conversation
  useEffect(() => {
    try {
      localStorage.setItem('forgemind_floating_chat', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  // Scroll to bottom on message
  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isThinking]);

  // Global listener to open chat from any quick action button
  useEffect(() => {
    const handleOpenEvent = (e: CustomEvent<{ prompt?: string }>) => {
      setIsOpen(true);
      setIsMinimized(false);
      setHasUnread(false);
      if (e.detail?.prompt) {
        handleSendMessage(e.detail.prompt);
      } else {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    };

    window.addEventListener('forgemind:open-chat' as any, handleOpenEvent);
    return () => {
      window.removeEventListener('forgemind:open-chat' as any, handleOpenEvent);
    };
  }, []);

  const quickPrompts = [
    'What causes Surface Rust and how to verify it?',
    'Explain FMEA failure modes for Crack defects',
    'How does Cure & Prevention learn from verified cases?',
    'What is the difference between [MODEL] confidence and [SIMILARITY]?',
    'Why is financial loss restricted to user-selected percentages?',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      time,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    // Extract active inspection context if user is on an analysis page
    let inspectionContext: any = null;
    const match = window.location.pathname.match(/\/analysis\/([A-Za-z0-9_-]+)/);
    if (match && match[1]) {
      const activeInspection = getInspectionById(match[1]);
      if (activeInspection) {
        inspectionContext = {
          inspection_id: activeInspection.id,
          defect: activeInspection.prediction,
          confidence: activeInspection.confidence,
          gradcam_available: true,
          active_case_status: 'NEW',
          economic_impact: 'MEDIUM (10%)',
          recommended_action:
            activeInspection.investigation?.recommended_actions?.[0]?.action ||
            'Audit coolant pH and drying knife dwell time',
        };
      }
    }

    // Try backend Factory Assistant API (powered by Gemini + RAG)
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch(`${apiBase}/api/v1/factory-assistant/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          inspection_context: inspectionContext,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tags: data.provenance_tags || ['[ADVISORY]'],
          sources: (data.sources || []).slice(0, 3),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsThinking(false);
        if (isMinimized) setHasUnread(true);
        return;
      }
    } catch (err) {
      console.warn('Backend Assistant API notice, using deterministic fallback:', err);
    }

    // Local deterministic fallback (offline / network error resilience)
    setTimeout(() => {
      const lower = query.toLowerCase();
      let replyText = '';
      let tags: string[] = ['[ADVISORY]'];

      if (lower.includes('rust') || lower.includes('corrosion')) {
        replyText =
          '**Surface Rust / Oxidation [HYPOTHESIS]:**\n\n' +
          '• **Root Factors:** Water-soluble coolant concentration dropping below 8.5% Brix, elevated staging humidity (>75% RH), or delayed post-machining wash passivating cycle.\n' +
          '• **Recommended SOP:** Restore anti-corrosion inhibitor ratio, initiate forced-air heated dry-off, and apply protective dip per SOP-512.\n' +
          '• **Verification:** Review subsequent batch runs in Cure & Prevention to confirm zero recurring oxidation.';
        tags = ['[HYPOTHESIS]', '[ADVISORY]', '[HISTORICAL]'];
      } else if (lower.includes('crack')) {
        replyText =
          '**Material Crack Anomalies [HYPOTHESIS]:**\n\n' +
          '• **Root Factors:** Hydraulic fixture over-clamping torque, aggressive feed-rate thermal shocks, or quenching temperature gradients along stress concentration planes.\n' +
          '• **Recommended SOP:** Audit spindle feed rates (-8% damping), re-aim coolant delivery nozzles, and recalibrate tool offsets per SOP-318.\n' +
          '• **Safety Note:** Cracks represent critical structural integrity hazards. Automatic repair is never claimed; on-site NDT confirmation is required.';
        tags = ['[HYPOTHESIS]', '[ADVISORY]'];
      } else if (lower.includes('scratch')) {
        replyText =
          '**Surface Scratch Defects [HYPOTHESIS]:**\n\n' +
          '• **Root Factors:** Fixture contact pad debris accumulation, misaligned transfer guide rails, or robotic gripper burrs.\n' +
          '• **Historical Resolution:** Clean and replace guide rail wiper pads (referenced in CASE-DEMO-018).\n' +
          '• **What-If Option:** Way 1 precision targeted micro-buffing (+8.5% Net Profit Recovery, +2.5 min in-line buffer).';
        tags = ['[HISTORICAL EVIDENCE]', '[ADVISORY]'];
      } else if (lower.includes('hole') || lower.includes('porosity') || lower.includes('void')) {
        replyText =
          '**Porosity Voids & Holes [HYPOTHESIS]:**\n\n' +
          '• **Root Factors:** Crucible dissolved hydrogen gas precipitation, restricted die cavity air vents, or turbulent shot plunger injection velocity (NADCA standards).\n' +
          '• **Corrective Guidance:** Clear die venting channels and extend inert gas (argon) degassing cycle dwell per SOP-209.';
        tags = ['[HYPOTHESIS]', '[ADVISORY]'];
      } else if (lower.includes('cure') || lower.includes('prevention') || lower.includes('verified') || lower.includes('learning')) {
        replyText =
          '**Cure & Prevention Learning Loop:**\n\n' +
          '1. Detects recurring defects by searching the historical defect library.\n' +
          '2. Human operator reviews prior SOPs and clicks **[ ✓ APPLY PREVIOUS ACTION ]**.\n' +
          '3. Once physical corrective action is performed and follow-up run completes, clicking **[ MARK VERIFIED ]** registers the case into the dynamic library for future reuse across the factory.\n' +
          '4. Strict Non-Fabrication Rule: Verification data availability is explicitly disclosed as human-confirmed.';
        tags = ['[DECISION SUPPORT]', '[USER CONFIRMED]'];
      } else if (lower.includes('confidence') || lower.includes('similarity') || lower.includes('model')) {
        replyText =
          '**Metric Decoupling Architecture:**\n\n' +
          '• **Vision Confidence [MODEL]:** Classifier certainty over pixel features (e.g. 99.5%). It is strictly an image classifier metric.\n' +
          '• **Similarity Score [SIMILARITY]:** Feature & aspect ratio match against historical cases (e.g. 95%).\n' +
          '• **Separation Guarantee:** Confidence is NEVER equated with similarity percentage, root-cause probability, or financial loss.';
        tags = ['[MODEL]', '[SIMILARITY]'];
      } else if (lower.includes('financial') || lower.includes('economic') || lower.includes('cost') || lower.includes('loss') || lower.includes('profit')) {
        replyText =
          '**Simulated Economic Model:**\n\n' +
          '• Because the organizer dataset provides no product cost, BOM value, rework cost, or ERP records, ForgeMind does NOT invent monetary numbers.\n' +
          '• Economic impact uses a user-selected operational tier: LOW (5%), MEDIUM (10%), or HIGH (20%).\n' +
          '• Curing the defect demonstrates value recovery (+8% Net Profit Recovery) without fabricating fake financial claims.';
        tags = ['[SIMULATED]', '[DECISION SUPPORT]'];
      } else {
        replyText =
          `Regarding your inquiry on "${query}":\n\n` +
          `ForgeMind AI connects computer vision defect detection directly to engineering failure mode analysis (FMEA) and corrective action libraries.\n\n` +
          `• All root-cause suggestions are tagged [HYPOTHESIS] requiring engineer validation.\n` +
          `• Corrective procedures are tagged [ADVISORY].\n` +
          `• Feel free to ask about specific defect types (Crack, Scratch, Rust, Hole), remediation trade-offs, or Cure & Prevention SOPs.`;
        tags = ['[DECISION SUPPORT]', '[ADVISORY]'];
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tags,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
      if (!isOpen || isMinimized) {
        setHasUnread(true);
      }
    }, 600);
  };

  const handleClearHistory = () => {
    const initMsg: ChatMessage = {
      id: 'msg-init-cleared',
      sender: 'assistant',
      text: 'Conversation cleared. How can I assist with your defect analysis or manufacturing SOPs?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tags: ['[DECISION SUPPORT]'],
    };
    setMessages([initMsg]);
    try {
      localStorage.removeItem('forgemind_floating_chat');
    } catch {}
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating Chat Drawer / Popover */}
      {isOpen && (
        <div
          className={`mb-3 w-[360px] sm:w-[420px] bg-slate-950/95 backdrop-blur-2xl border border-cyan-500/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(0,229,255,0.2)] flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn ${
            isMinimized ? 'h-14' : 'h-[580px] max-h-[82vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="h-14 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/60 border-b border-white/10 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-base shadow-[0_0_12px_rgba(0,229,255,0.3)]">
                🤖
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold font-heading text-white tracking-wide">
                    ForgeMind AI Assistant
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                    [FMEA]
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Floating Everywhere • Decision Support</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs"
                title="Clear conversation"
              >
                🗑️
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-xs font-mono font-bold"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '▢' : '—'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer text-xs font-bold"
                title="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Body (Hidden when minimized) */}
          {!isMinimized && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950/80">
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs font-sans">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                        m.sender === 'user'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-semibold shadow-[0_0_15px_rgba(0,229,255,0.25)] rounded-br-sm'
                          : 'bg-slate-900 border border-white/10 text-slate-200 shadow-md rounded-bl-sm font-normal'
                      }`}
                    >
                      {m.text}

                      {/* Evidence Tags */}
                      {m.tags && m.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10 text-[9px] font-mono">
                          {m.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Source Citations */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-1.5 pt-1.5 border-t border-white/5 text-[9px] font-mono text-slate-400">
                          <span className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">Evidence Grounding:</span>
                          {m.sources.map((s, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-1 truncate text-slate-300">
                              <span className="text-cyan-400">📄</span>
                              <span className="truncate">{s.doc_id ? `[${s.doc_id}] ` : ''}{s.source_name || s.section}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">
                      {m.time}
                    </span>
                  </div>
                ))}

                {/* Thinking Indicator */}
                {isThinking && (
                  <div className="flex items-start gap-2">
                    <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 text-xs text-cyan-300 flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-[11px] font-mono text-slate-400 ml-1">Analyzing knowledge base...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompts Chips Carousel */}
              <div className="px-3 py-2 border-t border-white/5 bg-slate-900/60 overflow-x-auto no-scrollbar flex gap-1.5 shrink-0">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(p)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-[11px] font-mono transition whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Input Box */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 border-t border-white/10 bg-slate-950 flex flex-col gap-1.5 shrink-0"
              >
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about defect FMEA, SOPs, trade-offs..."
                    className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 text-slate-950 font-bold text-xs font-heading transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,229,255,0.3)] flex items-center gap-1 shrink-0"
                  >
                    <span>Send</span>
                    <span>➤</span>
                  </button>
                </div>
                <div className="text-[9px] font-mono text-slate-500 text-center">
                  Decision support only &bull; Does not claim automatic defect repair
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        type="button"
        id="floating-chatbot-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          setIsMinimized(false);
          setHasUnread(false);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 150);
          }
        }}
        className="group relative flex items-center gap-2 px-4 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-400 text-slate-950 font-bold text-xs font-heading shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:shadow-[0_0_40px_rgba(0,229,255,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border border-cyan-300/40"
        title="Open ForgeMind AI Assistant"
      >
        {/* Glow Ring Effect */}
        <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 opacity-40 blur-sm group-hover:opacity-75 transition duration-500 group-hover:duration-200 animate-pulse" />

        <div className="relative flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <span className="text-slate-950 font-bold text-xs tracking-wide">
            {isOpen ? 'Close Assistant' : 'AI Assistant'}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 animate-ping" />
        </div>

        {/* Unread Message Pill Badge */}
        {hasUnread && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white font-mono text-[10px] flex items-center justify-center font-bold border-2 border-slate-950 shadow-md animate-bounce">
            1
          </span>
        )}
      </button>
    </div>
  );
};
