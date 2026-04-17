"use client";

type AykaNeuralLoadingProps = {
  title?: string;
  subtitle?: string;
};

const NODES = [
  { top: "12%", left: "14%", delay: "0s" },
  { top: "24%", left: "34%", delay: "0.2s" },
  { top: "18%", left: "58%", delay: "0.4s" },
  { top: "30%", left: "78%", delay: "0.1s" },
  { top: "46%", left: "22%", delay: "0.6s" },
  { top: "50%", left: "46%", delay: "0.3s" },
  { top: "44%", left: "68%", delay: "0.5s" },
  { top: "64%", left: "12%", delay: "0.2s" },
  { top: "70%", left: "34%", delay: "0.7s" },
  { top: "68%", left: "56%", delay: "0.1s" },
  { top: "76%", left: "78%", delay: "0.4s" },
  { top: "86%", left: "44%", delay: "0.25s" },
];

const LINKS = [
  { top: "18%", left: "15%", width: "21%", rotate: "18deg", delay: "0s" },
  { top: "24%", left: "35%", width: "24%", rotate: "-8deg", delay: "0.2s" },
  { top: "24%", left: "57%", width: "22%", rotate: "20deg", delay: "0.4s" },
  { top: "36%", left: "24%", width: "23%", rotate: "10deg", delay: "0.15s" },
  { top: "42%", left: "45%", width: "23%", rotate: "-7deg", delay: "0.3s" },
  { top: "56%", left: "13%", width: "22%", rotate: "15deg", delay: "0.35s" },
  { top: "62%", left: "33%", width: "24%", rotate: "-4deg", delay: "0.5s" },
  { top: "70%", left: "54%", width: "24%", rotate: "14deg", delay: "0.65s" },
];

export function AykaNeuralLoading({
  title = "Ayka está construindo sua descrição",
  subtitle = "Analisando contexto, conectando ideias e montando uma versão incrível para o corretor.",
}: AykaNeuralLoadingProps) {
  return (
    <div className="fixed inset-0 z-[120] overflow-hidden bg-[#b1042f]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.2),transparent_45%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#cf0f3a] via-[#b1042f] to-[#820021]" />

      <div className="pointer-events-none absolute inset-0 opacity-85">
        {LINKS.map((link, index) => (
          <span
            key={`link-${index}`}
            className="ayka-link absolute block h-[2px] rounded-full bg-white/55"
            style={{
              top: link.top,
              left: link.left,
              width: link.width,
              transform: `rotate(${link.rotate})`,
              animationDelay: link.delay,
            }}
          />
        ))}
        {NODES.map((node, index) => (
          <span
            key={`node-${index}`}
            className="ayka-node absolute block h-3 w-3 rounded-full bg-white"
            style={{
              top: node.top,
              left: node.left,
              animationDelay: node.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <div className="w-full max-w-2xl rounded-3xl border border-white/30 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-lg">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/40 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white/90">
            Neural Engine Ayka
          </div>
          <h2 className="text-2xl font-semibold text-white md:text-3xl">{title}</h2>
          <p className="mt-3 text-sm text-white/90 md:text-base">{subtitle}</p>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-white/80">
            Não feche ou recarregue esta tela durante a geração.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="ayka-dot h-2.5 w-2.5 rounded-full bg-white" />
            <span className="ayka-dot h-2.5 w-2.5 rounded-full bg-white" />
            <span className="ayka-dot h-2.5 w-2.5 rounded-full bg-white" />
          </div>
        </div>
      </div>

      <style jsx>{`
        .ayka-node {
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.8);
          animation: pulseNode 1.8s ease-in-out infinite;
        }
        .ayka-link {
          transform-origin: left center;
          animation: flowLink 2.2s ease-in-out infinite;
        }
        .ayka-dot {
          animation: jumpDot 1s ease-in-out infinite;
        }
        .ayka-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .ayka-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes pulseNode {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.25);
          }
        }
        @keyframes flowLink {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.9;
          }
        }
        @keyframes jumpDot {
          0%,
          80%,
          100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
