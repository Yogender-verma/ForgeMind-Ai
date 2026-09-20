import React, { useState } from 'react';

export const AssistantView: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string; time: string }>
  >([
    {
      sender: 'assistant',
      text: 'Greetings, Engineer. I am ForgeMind AI Assistant, connected to your visual inspection logs and discrete-event manufacturing process models. Ask me anything regarding defect diagnostics, line bottlenecks, scrap loss, or intervention what-if simulations.',
      time: '10:00 AM',
    },
  ]);

  const [input, setInput] = useState('');

  const quickPrompts = [
    'What mechanical factors contribute to crack anomalies?',
    'Explain the evidence taxonomy ([MEASURED], [CALCULATED], [SIMULATED], [HYPOTHESIS]).',
    'What process conditions cause surface porosity holes?',
    'Why is financial loss quantification currently restricted?',
  ];

  const handleSend = (textToSend?: string) => {
    const question = (textToSend || input).trim();
    if (!question) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = { sender: 'user' as const, text: question, time };

    let reply = 'Regarding your inquiry: ';
    const lower = question.toLowerCase();

    if (lower.includes('crack')) {
      reply =
        'According to AIAG & VDA FMEA standards, mechanical cracks correlate with hydraulic fixture clamping shocks, excessive cutting friction from tool wear, or rapid thermal quenching gradients. Audit fixture alignment and tool radius tolerances.';
    } else if (lower.includes('evidence') || lower.includes('taxonomy') || lower.includes('calculated') || lower.includes('simulated')) {
      reply =
        'ForgeMind AI strictly enforces 5 evidence classes: [MEASURED] directly in raw source files; [CALCULATED] deterministic mathematical derivations; [ESTIMATED] model estimates; [SIMULATED] forward-looking discrete-event scenarios; [HYPOTHESIS] advisory failure-mode explanations requiring physical verification.';
    } else if (lower.includes('hole') || lower.includes('porosity')) {
      reply =
        'According to NADCA die casting standards, spherical porosity holes typically result from dissolved hydrogen precipitation or trapped air during turbulent mold injection. Verify crucible degassing dwell times and cavity venting channels.';
    } else if (lower.includes('financial') || lower.includes('cost') || lower.includes('loss') || lower.includes('scrap')) {
      reply =
        'Financial impact cannot currently be calculated because cost/revenue data is not available in the organizer-provided discrete-event simulation dataset. ForgeMind strictly refuses to invent fake prices or scrap monetary values.';
    } else {
      reply = `Regarding "${question}": Visual-to-production record linkage is not available in the supplied datasets. Inquiries regarding failure modes are advisory engineering hypotheses derived from technical standards requiring engineer review.`;
    }

    const aiMsg = { sender: 'assistant' as const, text: reply, time };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h2 className="text-2xl font-extrabold font-heading text-white tracking-tight">
            ForgeMind Industrial AI Assistant
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Contextual decision-support for defect investigation, process diagnostics, and intervention planning.
        </p>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(p)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-400/40 text-slate-300 hover:text-cyan-300 text-xs font-mono transition text-left cursor-pointer"
          >
            "{p}"
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="rounded-3xl p-6 bg-slate-950/80 border border-white/10 space-y-4 shadow-xl">
        <div className="h-[400px] overflow-y-auto space-y-4 pr-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                m.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'bg-slate-900 border border-white/10 text-slate-200 font-sans'
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] font-mono text-slate-500 mt-1 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 pt-2 border-t border-white/10"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your industrial question (e.g. defect root-causes, what-if questions)..."
            className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 text-slate-950 text-xs font-bold font-heading transition cursor-pointer"
          >
            Ask AI
          </button>
        </form>
      </div>
    </div>
  );
};
