import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import GlitchText from './GlitchText';
import { ArrowRight, ShieldAlert, Lock, CheckCircle2, ShieldCheck, Database, Server } from 'lucide-react';
import { Link } from 'react-router-dom';

/* ---------- Reusable primitives ---------- */

const RevealText = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const RevealLine = ({ delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ scaleX: 0 }}
      animate={inView ? { scaleX: 1 } : {}}
      transition={{ duration: 1, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ originX: 0 }}
      className="h-px bg-trace w-full mb-8"
    />
  );
};

/* ---------- Sections ---------- */

export const HeroSection = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  // Hero text drifts up and fades as user scrolls past
  const heroY = useTransform(scrollYProgress, [0, 1], ['0px', '-80px']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
  <div ref={ref} className="w-full flex flex-col items-center justify-center text-center px-6 py-24 select-none relative" style={{ minHeight: '100svh' }}>
    {/* Dark vignette behind hero text so it's legible */}
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.4) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />

    <motion.div style={{ y: heroY, opacity: heroOpacity }}>
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.4em' }}
        animate={{ opacity: 1, letterSpacing: '0.1em' }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-trace mono uppercase mb-6 relative"
        style={{ fontSize: '12px' }}
      >
        [ // SYSTEM_AUDITOR_CORE_v2.0 ]
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.0, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="text-ink font-bold mb-8"
        style={{ fontSize: 'clamp(36px, 7vw, 80px)', lineHeight: '1.0', letterSpacing: '-0.04em', maxWidth: '900px' }}
      >
        <GlitchText text={'FIND THE PATH\nBEFORE THEY DO.'} duration={1100} delay={400} />
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="text-ink-dim mb-12 max-w-xl"
        style={{ fontSize: '16px', lineHeight: '1.7' }}
      >
        Multi-vendor network and cloud compliance auditing. Ingest raw configs,<br />
        correlate findings, sever attack paths.
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.7 }}
        className="flex items-center gap-4 flex-wrap justify-center pointer-events-auto"
      >
        <Link to="/audit/upload" className="bracket-btn px-8 py-4 flex items-center gap-3 text-sm">
          [ LAUNCH_AUDITOR ] <ArrowRight size={16} />
        </Link>
        <Link to="/audit/findings" className="bracket-btn px-8 py-4 flex items-center gap-3 text-sm">
          [ VIEW_SAMPLE_REPORT ]
        </Link>
      </motion.div>
    </motion.div>

    {/* Scroll cue */}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 1 }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
    >
      <span className="text-wire mono text-xs uppercase tracking-widest">SCROLL</span>
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        className="w-px h-8 bg-wire"
      />
    </motion.div>
  </div>
  );
};

/* ---- Panel layout shared by all sections ---- */
const PanelLayout = ({ tag, number, title, children }) => (
  <div
    className="py-24 px-6 border-b-wire"
    style={{
      background: 'rgba(16, 20, 26, 0.55)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}
  >
    <div className="max-w-5xl mx-auto">
      <RevealText delay={0}>
        <div className="text-trace mono uppercase mb-3 flex items-center gap-4" style={{ fontSize: '12px', letterSpacing: '0.1em' }}>
          <span className="text-wire">//</span> {number}_{tag}
        </div>
        <RevealLine />
        <h2 className="text-ink font-bold uppercase mb-12" style={{ fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: '1.05', letterSpacing: '-0.03em' }}>
          {title}
        </h2>
      </RevealText>
      {children}
    </div>
  </div>
);

export const TheGapSection = () => (
  <PanelLayout tag="THE_GAP" number="01" title={<>SYNTACTIC DIVERSITY<br />SHOULDN'T MEAN BLINDNESS.</>}>
    <div className="flex flex-col md:flex-row gap-12 items-start">
      <RevealText delay={0.1} className="flex-1">
        <p className="text-ink-dim mb-6" style={{ fontSize: '15px', lineHeight: '1.8' }}>
          Your firewall speaks ASA. Your switches speak IOS. Your cloud speaks Terraform. Traditional scanners run single-vendor rules, leaving you to manually stitch together context.
        </p>
        <p className="text-ink-dim" style={{ fontSize: '15px', lineHeight: '1.8' }}>
          The Compliance Auditor standardizes raw syntax into a unified graph, so CIS benchmarks evaluate the network as a single interconnected organism.
        </p>
      </RevealText>

      <div className="flex-1 w-full flex flex-col gap-4">
        {[
          { prefix: '[!]', color: 'var(--severity-high)', label: 'CISCO_IOS_NODE:', code: 'ip ssh version 1' },
          { prefix: '[*]', color: 'var(--severity-medium)', label: 'TERRAFORM_NODE:', code: 'ingress { cidr = "0.0.0.0/0" }' },
          { prefix: '[ CRITICAL ]', color: 'var(--severity-critical)', label: 'NORMALIZED:', code: 'PATH EXPOSED (INTERNET → MGMT)', highlight: true },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
            className="tactical-border crosshair-corner p-5 mono text-sm flex items-center gap-4"
            style={item.highlight ? { backgroundColor: 'rgba(255,51,102,0.08)', borderColor: 'var(--severity-critical)' } : {}}
          >
            <span className="font-bold shrink-0" style={{ color: item.color }}>{item.prefix}</span>
            <span className="text-ink-dim shrink-0">{item.label}</span>
            <span className="text-ink" style={item.highlight ? { color: item.color } : {}}>{item.code}</span>
          </motion.div>
        ))}
      </div>
    </div>
  </PanelLayout>
);

export const HowItWorksSection = () => {
  const steps = [
    { icon: <Database size={20} />, title: 'INGEST', desc: 'Upload .cfg, .txt, or .tf files. No pre-processing required.' },
    { icon: <Server size={20} />, title: 'NORMALIZE', desc: 'Parsers extract entities and topological relationships.' },
    { icon: <ShieldAlert size={20} />, title: 'RULE_ENGINE', desc: 'CIS-based logic evaluates every node against security baselines.' },
    { icon: <ArrowRight size={20} />, title: 'CORRELATE', desc: 'Isolated findings are linked to reveal full attack paths.' },
    { icon: <CheckCircle2 size={20} />, title: 'REPORT', desc: 'Generate compliance scores and prioritized remediation CLI.' },
  ];

  return (
    <PanelLayout tag="ENGINE" number="02" title={<>DETERMINISTIC<br />ANALYSIS PIPELINE.</>}>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-0 w-full">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col relative group border-r-0 md:border-r border-wire last:border-r-0 pr-6 pl-6 first:pl-0 py-2"
          >
            <motion.div
              whileHover={{ scale: 1.1, borderColor: 'var(--trace)' }}
              className="w-10 h-10 flex items-center justify-center tactical-border text-ink-dim mb-4 group-hover:text-trace transition-colors"
            >
              {step.icon}
            </motion.div>
            <div className="text-ink mono font-bold text-sm mb-2">{step.title}</div>
            <p className="text-ink-dim text-xs leading-relaxed">{step.desc}</p>

            {/* Animated connector */}
            {i < steps.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * i + 0.3 }}
                style={{ originX: 0 }}
                className="hidden md:block absolute h-px bg-wire"
                style2={{ top: '20px', right: '-2px', width: '16px' }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </PanelLayout>
  );
};

export const DifferentiatorSection = () => (
  <PanelLayout tag="COMPARISON" number="03" title={<>BEYOND<br />BASIC LINTING.</>}>
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="tactical-border crosshair-corner overflow-hidden w-full"
    >
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="tactical-border-b" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <th className="p-4 text-ink-dim mono text-xs uppercase tracking-widest font-normal">CAPABILITY</th>
            <th className="p-4 text-trace mono text-xs uppercase tracking-widest font-bold tactical-border-l">AUDITOR_CORE</th>
            <th className="p-4 text-ink-dim mono text-xs uppercase tracking-widest font-normal tactical-border-l">TRADITIONAL_SCANNERS</th>
          </tr>
        </thead>
        <tbody className="mono text-sm">
          {[
            ['Context-Aware Paths', '[+] YES', 'Isolated findings only'],
            ['Multi-Vendor Topology', '[+] YES', 'Siloed per vendor'],
            ['Remediation Snippets', '[+] EXACT CLI', 'Documentation links'],
            ['Offline / Air-Gapped', '[+] SUPPORTED', 'SaaS only'],
          ].map(([cap, our, their], i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.08 * i }}
              className="tactical-border-b last:border-b-0 hover:bg-panel-raised transition-colors"
            >
              <td className="p-4 text-ink">{cap}</td>
              <td className="p-4 text-trace font-bold tactical-border-l">{our}</td>
              <td className="p-4 text-ink-dim tactical-border-l">{their}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  </PanelLayout>
);

export const DataSovereigntySection = () => (
  <PanelLayout tag="SOVEREIGNTY" number="04" title={<>YOUR CONFIGS NEVER<br />LEAVE YOUR NETWORK.</>}>
    <div className="flex flex-col md:flex-row gap-12 items-center">
      <RevealText delay={0.1} className="flex-1">
        <p className="text-ink-dim mb-4" style={{ fontSize: '15px', lineHeight: '1.8' }}>
          Built for high-security and intelligence environments. The entire parsing, evaluation, and correlation engine runs locally or within your private VPC.
        </p>
        <p className="text-ink-dim" style={{ fontSize: '15px', lineHeight: '1.8' }}>
          Only sanitized metric telemetry crosses the boundary, and only if explicitly enabled.
        </p>
      </RevealText>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="flex-1 w-full tactical-border crosshair-corner p-8 flex flex-col gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="tactical-border p-4 mono text-sm text-center text-ink flex-1">Raw Configs</div>
          <ArrowRight className="text-trace shrink-0" size={18} />
          <div className="tactical-border p-4 mono text-sm text-center flex-1 relative" style={{ borderColor: 'var(--trace)', color: 'var(--trace)' }}>
            <ShieldCheck size={14} className="absolute -top-1.5 -right-1.5" style={{ color: 'var(--trace)' }} />
            Local Engine
          </div>
        </div>
        <div className="w-full h-px" style={{ background: 'repeating-linear-gradient(to right, var(--wire) 0, var(--wire) 4px, transparent 4px, transparent 12px)' }} />
        <div className="flex items-center gap-4 opacity-40">
          <div style={{ width: '120px' }} />
          <Lock className="text-wire shrink-0" size={14} />
          <div className="tactical-border p-3 mono text-xs text-center flex-1 text-ink-dim">
            Internet Boundary
          </div>
        </div>
      </motion.div>
    </div>
  </PanelLayout>
);

/* Animates a number from 0 to `target` when scrolled into view */
const CountUp = ({ target, suffix = '', decimals = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const [display, setDisplay] = React.useState('0');

  React.useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target.toFixed(decimals) + suffix);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = eased * target;
      setDisplay(value.toFixed(decimals) + suffix);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, suffix, decimals]);

  return <span ref={ref}>{display}</span>;
};

export const MetricsSection = () => (
  <PanelLayout tag="METRICS" number="05" title={<>PERFORMANCE ON<br />TEST CORPUS.</>}>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
      {[
        { label: 'DETECTION_RATE',   target: 94,  suffix: '%',  decimals: 0, sub: '47 of 50 known findings' },
        { label: 'FALSE_POSITIVES',  target: 2.1, suffix: '%',  decimals: 1, sub: '3 of 143 flagged rules' },
        { label: 'PATHS_CORRELATED', target: 38,  suffix: '',   decimals: 0, sub: 'across 12 test devices' },
      ].map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 * i, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
          className="tactical-border crosshair-corner p-10 flex flex-col items-center justify-center cursor-default"
        >
          <div
            className="text-trace mono font-bold mb-4"
            style={{ fontSize: '56px', lineHeight: 1 }}
          >
            <CountUp target={m.target} suffix={m.suffix} decimals={m.decimals} />
          </div>
          <div className="text-ink-dim mono text-xs uppercase tracking-widest">[ {m.label} ]</div>
          <div className="text-wire mt-3 text-xs mono">{m.sub}</div>
        </motion.div>
      ))}
    </div>
  </PanelLayout>
);

export const FooterSection = () => (
  <footer className="py-12 px-8 tactical-border-t">
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
      <div>
        <div className="text-ink mono font-bold mb-1 tracking-widest" style={{ fontSize: '13px' }}>COMPLIANCE AUDITOR</div>
        <div className="text-wire mono text-xs">// SIH_PROBLEM_STATEMENT_26155</div>
      </div>
      <div className="flex gap-8 text-sm mono">
        <Link to="/audit" className="text-ink-dim hover:text-trace transition-colors uppercase tracking-widest text-xs">Dashboard</Link>
        <a href="https://github.com/manas010506/sih26155-auditor" target="_blank" rel="noreferrer" className="text-ink-dim hover:text-trace transition-colors uppercase tracking-widest text-xs">GitHub</a>
      </div>
    </div>
  </footer>
);
