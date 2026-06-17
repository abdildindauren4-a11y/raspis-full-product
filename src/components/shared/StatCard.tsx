import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  gradient?: "blue" | "purple" | "green" | "amber";
  index?: number;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  trend = "neutral",
  trendValue = "",
  gradient = "blue",
  index = 0,
}: StatCardProps) {
  const gradientMap = {
    blue: "from-[var(--accent)] to-[#0072FF]",
    purple: "from-[var(--accent-2)] to-[#A855F7]",
    green: "from-[#10B981] to-[#34D399]",
    amber: "from-[#F59E0B] to-[#FBBF24]",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "status-good" : trend === "down" ? "status-bad" : "text-muted-c";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 * index, duration: 0.5, ease: "easeOut" }}
      className="glass rounded-2xl p-6 hover:-translate-y-1 hover:border-white/[0.12] transition-all duration-300 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradientMap[gradient]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-strong-c" />
        </div>
        {trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            {trendValue}
          </div>
        )}
      </div>
      <div className="mb-1">
        <span className="font-['IBM_Plex_Sans'] text-4xl font-bold gradient-text">
          {value.toLocaleString()}
        </span>
        {suffix && <span className="text-lg text-muted-c ml-1">{suffix}</span>}
      </div>
      <p className="text-sm font-medium text-muted-c uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}
