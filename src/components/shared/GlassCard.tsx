import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glowColor?: "blue" | "purple" | "green" | "amber" | "none";
  topBorder?: boolean;
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className,
  hover = true,
  glowColor = "none",
  topBorder = false,
  onClick,
}: GlassCardProps) {
  const glowMap = {
    blue: "hover:shadow-[0_4px_20px_rgba(0,198,255,0.3)]",
    purple: "hover:shadow-[0_4px_20px_rgba(139,92,246,0.3)]",
    green: "hover:shadow-[0_4px_20px_rgba(16,185,129,0.3)]",
    amber: "hover:shadow-[0_4px_20px_rgba(245,158,11,0.3)]",
    none: "",
  };

  return (
    <motion.div
      whileHover={hover ? { y: -4 } : undefined}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "glass rounded-2xl p-6 transition-all duration-300",
        hover && "hover:border-white/[0.12] cursor-pointer",
        hover && glowMap[glowColor],
        topBorder && "border-t-[3px] border-t-transparent",
        className
      )}
      style={
        topBorder
          ? {
              borderImage: "linear-gradient(135deg, var(--accent), var(--accent-2)) 1",
              borderImageSlice: "3 0 0 0",
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
