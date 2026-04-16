import { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `You are the SignalChain — a precision diagnostic instrument that identifies exactly where in the information chain a structure breaks down.

The chain has four sequential nodes derived from a single formula:

I(B) is defined  ⟺  A = C

The four nodes are:

SIGNAL — Is I(B) being produced at all? Is genuine information about the variable element reaching anyone in the system?

MEDIUM — Is the relation between A and B intact? Is there a transmission substrate through which the signal can travel?

POTENTIAL — Is A = C being held? What is the energy cost of maintaining it, who is bearing it, and is it sustainable?

PHASE — Is A = C local or global? Is the condition stable in one place only, or everywhere simultaneously and self-sustaining?

## CRITICAL CHAIN LOGIC

The chain is sequential. A broken node makes all subsequent nodes indeterminate — not broken, not intact, simply unmeasurable from that point. Mark them as INDETERMINATE.

Diagnose each node in order. Stop detailed analysis at the first confirmed break. Name the intervention specific to that break point.

## OUTPUT FORMAT

Use this exact structure:

SIGNAL — INTACT / BROKEN
[One precise sentence: what is or isn't flowing]

MEDIUM — INTACT / BROKEN / INDETERMINATE
[One precise sentence: what the transmission substrate is or where it fails]

POTENTIAL — INTACT / BROKEN / INDETERMINATE
[One precise sentence: what is holding A = C or what is depleting it]

PHASE — LOCAL / GLOBAL / INDETERMINATE
[One precise sentence: how far A = C has propagated]

BREAK POINT — [name the node where the chain first breaks]
[Two or three sentences: precisely what is failing and why]

INTERVENTION — [the minimum action that repairs this specific node]
[Two or three sentences: not a general strategy — the precise minimum action at the precise break point]

CHAIN STATE — [one line summary of the full chain in symbols]
Use: ✓ for intact, ✗ for broken, — for indeterminate, ◆ for global/immune

## VOICE RULES
- Precise and direct. No filler.
- Each node diagnosis in one sentence maximum.
- The intervention is specific to the break point — not a general recommendation.
- If multiple nodes are broken simultaneously, name all break points but prioritize the earliest in the chain.
- Never name the four pillars (Education, Distribution, Finance, Legitimacy). Only signal, medium, potential, phase.`;

const CHAIN_NODES = ["SIGNAL", "MEDIUM", "POTENTIAL", "PHASE"];

const NODE_STATES = {
  INTACT: { color: "#4ADE80", label: "INTACT", symbol: "✓" },
  BROKEN: { color: "#F87171", label: "BROKEN", symbol: "✗" },
  INDETERMINATE: { color: "#374151", label: "—", symbol: "—" },
  LOCAL: { color: "#FCD34D", label: "LOCAL", symbol: "◐" },
  GLOBAL: { color: "#4ADE80", label: "GLOBAL", symbol: "◆" },
  UNKNOWN: { color: "#1F2937", label: "···", symbol: "·" },
};

const parseChainStates = (text) => {
  const states = { SIGNAL: "UNKNOWN", MEDIUM: "UNKNOWN", POTENTIAL: "UNKNOWN", PHASE: "UNKNOWN" };
  const lines = text.toUpperCase();

  if (lines.includes("SIGNAL — INTACT") || lines.includes("SIGNAL: INTACT")) states.SIGNAL = "INTACT";
  else if (lines.includes("SIGNAL — BROKEN") || lines.includes("SIGNAL: BROKEN")) states.SIGNAL = "BROKEN";

  if (lines.includes("MEDIUM — INTACT") || lines.includes("MEDIUM: INTACT")) states.MEDIUM = "INTACT";
  else if (lines.includes("MEDIUM — BROKEN") || lines.includes("MEDIUM: BROKEN")) states.MEDIUM = "BROKEN";
  else if (lines.includes("MEDIUM — INDETERMINATE") || lines.includes("MEDIUM: INDETERMINATE")) states.MEDIUM = "INDETERMINATE";

  if (lines.includes("POTENTIAL — INTACT") || lines.includes("POTENTIAL: INTACT")) states.POTENTIAL = "INTACT";
  else if (lines.includes("POTENTIAL — BROKEN") || lines.includes("POTENTIAL: BROKEN")) states.POTENTIAL = "BROKEN";
  else if (lines.includes("POTENTIAL — INDETERMINATE") || lines.includes("POTENTIAL: INDETERMINATE")) states.POTENTIAL = "INDETERMINATE";

  if (lines.includes("PHASE — GLOBAL") || lines.includes("PHASE: GLOBAL")) states.PHASE = "GLOBAL";
  else if (lines.includes("PHASE — LOCAL") || lines.includes("PHASE: LOCAL")) states.PHASE = "LOCAL";
  else if (lines.includes("PHASE — INDETERMINATE") || lines.includes("PHASE: INDETERMINATE")) states.PHASE = "INDETERMINATE";

  return states;
};

const getBreakPoint = (text) => {
  const match = text.match(/BREAK POINT\s*[—:]\s*([A-Z]+)/i);
  return match ? match[1].toUpperCase() : null;
};

export default function SignalChain() {
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [chainStates, setChainStates] = useState({
    SIGNAL: "UNKNOWN", MEDIUM: "UNKNOWN", POTENTIAL: "UNKNOWN", PHASE: "UNKNOWN"
  });
  const [breakPoint, setBreakPoint] = useState(null);
  const outputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  useEffect(() => {
    if (output) {
      setChainStates(parseChainStates(output));
      setBreakPoint(getBreakPoint(output));
    }
  }, [output]);

  const run = async () => {
    if (!input.trim()) return;
    setOutput(""); setDone(false); setError("");
    setChainStates({ SIGNAL: "UNKNOWN", MEDIUM: "UNKNOWN", POTENTIAL: "UNKNOWN", PHASE: "UNKNOWN" });
    setBreakPoint(null);
    setLoading(true);

    const userMsg = context.trim()
      ? `Structure: ${input}\n\nContext: ${context}`
      : `Structure: ${input}`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMsg }],
          stream: true,
        }),
      });
      if (!res.ok) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const p = JSON.parse(data);
              if (p.type === "content_block_delta" && p.delta?.text)
                setOutput(prev => prev + p.delta.text);
            } catch {}
          }
        }
      }
      setDone(true);
    } catch {
      setError("Diagnostic failed. Check connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderOutput = (text) => {
    if (!text) return null;
    const lines = text.split("\n");

    return lines.map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={i} style={{ height: "0.4rem" }} />;

      // Node headers — SIGNAL, MEDIUM, POTENTIAL, PHASE
      const nodeMatch = CHAIN_NODES.find(n => trimmed.toUpperCase().startsWith(n + " —") || trimmed.toUpperCase().startsWith(n + ":"));
      if (nodeMatch) {
        const state = chainStates[nodeMatch];
        const meta = NODE_STATES[state] || NODE_STATES.UNKNOWN;
        const dashIdx = trimmed.indexOf("—");
        const colonIdx = trimmed.indexOf(":");
        const sepIdx = dashIdx > -1 ? dashIdx : colonIdx;
        const rest = sepIdx > -1 ? trimmed.slice(sepIdx + 1).trim() : "";
        return (
          <div key={i} style={{ marginTop: i > 0 ? "1.25rem" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.65rem",
                letterSpacing: "0.15em",
                color: meta.color,
                border: `1px solid ${meta.color}40`,
                padding: "0.2rem 0.5rem",
                minWidth: "5rem",
                textAlign: "center",
              }}>{nodeMatch}</span>
              <span style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.7rem",
                color: meta.color,
                letterSpacing: "0.1em",
              }}>{rest}</span>
            </div>
            <div style={{ height: "1px", background: `${meta.color}15`, marginTop: "0.4rem" }} />
          </div>
        );
      }

      // Break point header
      if (trimmed.toUpperCase().startsWith("BREAK POINT")) {
        return (
          <div key={i} style={{
            marginTop: "1.75rem",
            padding: "0.75rem 1rem",
            background: "#F8717108",
            border: "1px solid #F8717130",
            borderLeft: "3px solid #F87171",
          }}>
            <span style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.68rem",
              color: "#F87171",
              letterSpacing: "0.12em",
            }}>{trimmed}</span>
          </div>
        );
      }

      // Intervention header
      if (trimmed.toUpperCase().startsWith("INTERVENTION")) {
        return (
          <div key={i} style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            background: "#4ADE8008",
            border: "1px solid #4ADE8030",
            borderLeft: "3px solid #4ADE80",
          }}>
            <span style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.68rem",
              color: "#4ADE80",
              letterSpacing: "0.12em",
            }}>{trimmed}</span>
          </div>
        );
      }

      // Chain state summary line
      if (trimmed.toUpperCase().startsWith("CHAIN STATE")) {
        return (
          <div key={i} style={{
            marginTop: "1.75rem",
            padding: "0.75rem 1rem",
            background: "#0A1628",
            border: "1px solid #1E3A5F",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <span style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.58rem",
              color: "#1E3A5F",
              letterSpacing: "0.2em",
            }}>CHAIN STATE</span>
            <span style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.8rem",
              color: "#60A5FA",
              letterSpacing: "0.2em",
            }}>{trimmed.replace(/CHAIN STATE\s*[—:]\s*/i, "")}</span>
          </div>
        );
      }

      return (
        <p key={i} style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: "0.75rem",
          color: "#4B5563",
          lineHeight: 1.8,
          margin: "0.15rem 0",
          letterSpacing: "0.01em",
          paddingLeft: "0.25rem",
        }}>{line}</p>
      );
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500&family=Syne:wght@300;400;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030712; }

        .sc-root {
          min-height: 100vh;
          background: #030712;
          color: #E2E8F0;
          padding: 3rem 2rem 6rem;
          max-width: 720px;
          margin: 0 auto;
          position: relative;
        }

        .sc-root::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background:
            linear-gradient(rgba(14, 165, 233, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14, 165, 233, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .sc-content { position: relative; z-index: 1; }

        .sc-header {
          margin-bottom: 2.5rem;
          padding-bottom: 2rem;
          border-bottom: 1px solid #0F172A;
        }

        .sc-eyebrow {
          font-family: 'Fira Code', monospace;
          font-size: 0.55rem;
          letter-spacing: 0.3em;
          color: #1E3A5F;
          margin-bottom: 0.75rem;
        }

        .sc-title {
          font-family: 'Syne', sans-serif;
          font-size: 2.8rem;
          font-weight: 700;
          color: #E2E8F0;
          line-height: 1;
          letter-spacing: -0.02em;
          margin-bottom: 0.5rem;
        }

        .sc-title span {
          color: #0EA5E9;
        }

        .sc-formula {
          font-family: 'Fira Code', monospace;
          font-size: 0.72rem;
          color: #1E3A5F;
          margin-top: 1rem;
          padding: 0.6rem 1rem;
          background: #030F1E;
          border: 1px solid #0F172A;
          display: inline-block;
          letter-spacing: 0.05em;
        }

        .sc-chain-visual {
          display: flex;
          align-items: center;
          gap: 0;
          margin-top: 1.75rem;
          margin-bottom: 0;
        }

        .sc-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
        }

        .sc-node-box {
          width: 4.5rem;
          height: 4.5rem;
          border: 1px solid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.2rem;
          transition: all 0.3s ease;
          position: relative;
        }

        .sc-node-name {
          font-family: 'Fira Code', monospace;
          font-size: 0.5rem;
          letter-spacing: 0.15em;
          margin-top: 0.4rem;
        }

        .sc-node-symbol {
          font-family: 'Fira Code', monospace;
          font-size: 1rem;
        }

        .sc-node-state {
          font-family: 'Fira Code', monospace;
          font-size: 0.45rem;
          letter-spacing: 0.1em;
          opacity: 0.7;
        }

        .sc-connector {
          flex: 1;
          height: 1px;
          min-width: 1rem;
          transition: background 0.3s ease;
        }

        .sc-input-section { margin-bottom: 1.75rem; }

        .sc-label {
          font-family: 'Fira Code', monospace;
          font-size: 0.55rem;
          letter-spacing: 0.2em;
          color: #1E3A5F;
          margin-bottom: 0.4rem;
          display: block;
        }

        .sc-input {
          width: 100%;
          background: #030F1E;
          border: 1px solid #0F172A;
          border-bottom-color: #1E3A5F;
          color: #E2E8F0;
          font-family: 'Fira Code', monospace;
          font-size: 0.78rem;
          padding: 0.7rem 1rem;
          outline: none;
          transition: border-color 0.12s;
          display: block;
          margin-bottom: 0.85rem;
          letter-spacing: 0.02em;
        }
        .sc-input:focus { border-color: #1E3A5F; border-bottom-color: #0EA5E9; }
        .sc-input::placeholder { color: #0F172A; }
        .sc-textarea { resize: vertical; min-height: 65px; line-height: 1.6; }

        .sc-run-btn {
          font-family: 'Fira Code', monospace;
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          padding: 0.8rem 2rem;
          background: #0EA5E9;
          color: #030712;
          border: none;
          cursor: pointer;
          transition: all 0.12s;
          display: flex;
          align-items: center;
          gap: 0.7rem;
          font-weight: 500;
        }
        .sc-run-btn:hover:not(:disabled) { background: #38BDF8; }
        .sc-run-btn:disabled { opacity: 0.25; cursor: not-allowed; }

        .sc-pulse {
          width: 5px; height: 5px;
          background: #030712;
          border-radius: 50%;
          animation: scpulse 0.8s ease-in-out infinite;
        }
        @keyframes scpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.2;transform:scale(0.5)} }

        .sc-output-wrap {
          margin-top: 2.5rem;
          border-top: 1px solid #0F172A;
          padding-top: 2rem;
        }

        .sc-output-label {
          font-family: 'Fira Code', monospace;
          font-size: 0.55rem;
          letter-spacing: 0.2em;
          color: #1E3A5F;
          margin-bottom: 1.5rem;
        }

        .sc-output-scroll {
          max-height: 70vh;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .sc-output-scroll::-webkit-scrollbar { width: 1px; }
        .sc-output-scroll::-webkit-scrollbar-thumb { background: #0F172A; }

        .sc-cursor {
          display: inline-block;
          width: 6px; height: 0.85rem;
          background: #0EA5E9;
          vertical-align: text-bottom;
          animation: scblink 0.75s step-end infinite;
          margin-left: 2px;
        }
        @keyframes scblink { 0%,100%{opacity:1} 50%{opacity:0} }

        .sc-error {
          font-family: 'Fira Code', monospace;
          font-size: 0.65rem;
          color: #F87171;
          margin-top: 0.75rem;
          letter-spacing: 0.05em;
        }
      `}</style>

      <div className="sc-root">
        <div className="sc-content">
          <div className="sc-header">
            <div className="sc-eyebrow">OPENPROTOCOL — SIGNAL DIAGNOSTIC</div>
            <h1 className="sc-title">Signal<span>Chain</span></h1>

            <div className="sc-formula">
              I(B) is defined &nbsp;⟺&nbsp; A = C
            </div>

            <div className="sc-chain-visual">
              {CHAIN_NODES.map((node, i) => {
                const state = chainStates[node];
                const meta = NODE_STATES[state] || NODE_STATES.UNKNOWN;
                const isBreak = breakPoint === node;
                return (
                  <>
                    <div className="sc-node" key={node}>
                      <div className="sc-node-box" style={{
                        borderColor: isBreak ? "#F87171" : meta.color + "60",
                        background: meta.color + "08",
                        boxShadow: state !== "UNKNOWN" ? `0 0 12px ${meta.color}15` : "none",
                      }}>
                        <span className="sc-node-symbol" style={{ color: meta.color }}>
                          {meta.symbol}
                        </span>
                        <span className="sc-node-state" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {isBreak && (
                          <div style={{
                            position: "absolute",
                            top: "-4px", right: "-4px",
                            width: "8px", height: "8px",
                            background: "#F87171",
                            borderRadius: "50%",
                          }} />
                        )}
                      </div>
                      <span className="sc-node-name" style={{ color: meta.color + "99" }}>
                        {node}
                      </span>
                    </div>
                    {i < CHAIN_NODES.length - 1 && (
                      <div className="sc-connector" key={`c-${i}`} style={{
                        background: meta.color === NODE_STATES.UNKNOWN.color
                          ? "#0F172A"
                          : state === "BROKEN" ? "#F8717140" : meta.color + "40",
                      }} />
                    )}
                  </>
                );
              })}
            </div>
          </div>

          <div className="sc-input-section">
            <span className="sc-label">STRUCTURE</span>
            <input
              className="sc-input"
              type="text"
              placeh
