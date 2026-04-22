import { useState, useEffect } from "react";
import { Building2 } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState(0);
  // 0=init 1=bg 2=icon 3=text 4=shine 5=exit 6=done

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 50),
      setTimeout(() => setPhase(2), 350),
      setTimeout(() => setPhase(3), 850),
      setTimeout(() => setPhase(4), 1250),
      setTimeout(() => setPhase(5), 1550),
      setTimeout(() => { setPhase(6); onComplete(); }, 1850),
    ];
    return () => t.forEach(clearTimeout);
  }, [onComplete]);

  if (phase === 6) return null;

  const isExit = phase === 5;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, hsl(243 75% 59%), hsl(260 60% 65%), hsl(243 75% 50%))",
        opacity: isExit ? 0 : phase >= 1 ? 1 : 0,
        transform: isExit ? "scale(1.05)" : "scale(1)",
        transition: isExit
          ? "opacity 0.3s ease-out, transform 0.3s ease-out"
          : "opacity 0.3s ease-out",
      }}
    >
      {/* Center glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: 350, height: 350,
          background: "radial-gradient(circle, hsl(260 60% 75% / 0.4) 0%, transparent 70%)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 0.5s ease-out",
        }}
      />

      <div className="flex items-center gap-3 relative">
        {/* Icon */}
        <div style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: phase >= 2 ? "scale(1)" : "scale(0.7)",
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          <Building2 className="h-14 w-14" style={{ color: "hsl(0 0% 100%)" }} strokeWidth={1.8} />
        </div>

        {/* Text */}
        <div className="relative overflow-hidden">
          <span
            className="text-5xl font-bold tracking-tight"
            style={{
              display: "inline-block",
              color: "hsl(0 0% 100%)",
              opacity: phase >= 3 ? 1 : 0,
              transform: phase >= 3 ? "translateX(0)" : "translateX(30px)",
              transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            }}
          >
            Stayzy
          </span>
          {/* Shine */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 40%, hsl(0 0% 100% / 0.35) 50%, transparent 60%)",
              transform: phase >= 4 ? "translateX(250%)" : "translateX(-250%)",
              transition: "transform 0.3s ease-in-out",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
