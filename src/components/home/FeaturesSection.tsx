"use client";
import { motion } from "motion/react";

const features = [
  {
    title: "High-Speed Network",
    description: "Our servers run on 1Gbps+ connections with low latency and high availability — no delays.",
  },
  {
    title: "Untraceable Attacks",
    description: "Your tests run through spoofed servers with advanced network masking for anonymity.",
  },
  {
    title: "Advanced Methods",
    description: "Our system supports the most modern L4 and L7 attack vectors with bypass capabilities.",
  },
  {
    title: "24/7 Support",
    description: "Our staff is available around the clock to help you get the most out of EL7Stresser.",
  },
];

function SpeedIcon() {
  return (
    <motion.svg
      className="w-8 h-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ y: [0, -3, 0], x: [0, 3, 0] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </motion.svg>
  );
}

function MaskIcon() {
  return (
    <motion.svg
      className="w-8 h-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ opacity: [0.4, 1, 0.4], filter: ["blur(1px)", "blur(0px)", "blur(1px)"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </motion.svg>
  );
}

function MethodsIcon() {
  return (
    <motion.svg
      className="w-8 h-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={{ rotate: [0, 90, 90, 180, 180, 270, 270, 360] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </motion.svg>
  );
}

function SupportIcon() {
  return (
    <motion.svg
      className="w-8 h-8"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      <motion.path
        d="M22 12h-4l-3 9L9 3l-3 9H2"
        stroke="#e6edf3"
        strokeWidth="2"
        animate={{ strokeDasharray: ["0, 100", "100, 100"], strokeDashoffset: [0, -100] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
    </motion.svg>
  );
}

export function FeaturesSection() {
  return (
    <section className="w-full max-w-5xl mx-auto py-12 mb-10 flex flex-col px-4 md:px-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-bold mb-10 text-center"
      >
        Our Features
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { feat: features[0], icon: <SpeedIcon /> },
          { feat: features[1], icon: <MaskIcon /> },
          { feat: features[2], icon: <MethodsIcon /> },
          { feat: features[3], icon: <SupportIcon /> },
        ].map(({ feat, icon }, idx) => (
          <motion.div
            key={feat.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15, duration: 0.6 }}
            viewport={{ once: true }}
            className="group relative bg-panel border border-border rounded-xl p-6 flex flex-col items-center text-center overflow-hidden hover:border-white/20 transition-all duration-500 hover:-translate-y-1"
          >
            {/* Glowing background effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Icon Container with spinning border effect */}
            <div className="relative w-16 h-16 mb-6 rounded-2xl flex items-center justify-center bg-[#0d1117] border border-white/10 overflow-hidden shadow-lg">
              {/* Spinning conic gradient (visible on hover) */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#00000000_50%,#e6edf3_100%)]" />
              </div>
              {/* Inner mask to create the border */}
              <div className="absolute inset-[1px] rounded-2xl bg-[#0d1117] transition-colors duration-500 group-hover:bg-[#161b22]" />
              
              {/* The actual icon */}
              <div className="relative z-10 text-white/50 group-hover:text-white transition-colors duration-500">
                {icon}
              </div>
            </div>

            <h3 className="font-bold text-lg mb-2 text-white relative z-10">{feat.title}</h3>
            <p className="text-sm text-text-muted relative z-10 leading-relaxed">{feat.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
