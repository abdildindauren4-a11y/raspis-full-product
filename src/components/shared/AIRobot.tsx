import robotUrl from "@/assets/icons/ai-robot.png";

export type RobotStageGroup = "idle" | "scan" | "build" | "balance" | "done";

interface AIRobotProps {
  stageGroup: RobotStageGroup;
  size?: number;
  className?: string;
}

// Генерация кезінде РАСПИС AI роботының "жұмыс істеп жатыр" анимациясы —
// нақты кезеңге қарай айналасында әр түрлі жеңіл эффект көрсетеді.
export default function AIRobot({ stageGroup, size = 96, className = "" }: AIRobotProps) {
  return (
    <div className={`relative mx-auto ${className}`} style={{ width: size, height: size }}>
      <div className="absolute inset-[10%] rounded-full bg-[var(--accent)] opacity-25 blur-xl animate-glow-pulse" />
      <div className="absolute inset-0 animate-robot-bob">
        <img src={robotUrl} alt="РАСПИС AI" className="w-full h-full object-contain" draggable={false} />
      </div>

      {stageGroup === "scan" && (
        <div className="absolute left-[16%] right-[16%] top-[30%] h-[26%] overflow-hidden rounded-md pointer-events-none">
          <div className="absolute inset-x-0 h-0.5 bg-cyan-300 animate-scan-sweep" style={{ boxShadow: "0 0 8px 2px rgba(103,232,249,0.8)" }} />
        </div>
      )}

      {stageGroup === "build" && (
        <>
          {[
            { left: "4%", top: "14%" },
            { left: "80%", top: "20%" },
            { left: "10%", top: "72%" },
            { left: "76%", top: "68%" },
          ].map((pos, i) => (
            <span
              key={i}
              className="absolute w-2.5 h-2.5 rounded-[3px] border animate-grid-pop"
              style={{
                ...pos,
                borderColor: "var(--accent)",
                background: "rgba(74,144,217,0.35)",
                animationDelay: `${i * 0.35}s`,
              }}
            />
          ))}
        </>
      )}

      {stageGroup === "balance" && (
        <>
          <span
            className="absolute w-3 h-3 rounded-full animate-seesaw-a"
            style={{ left: "0%", top: "42%", background: "var(--accent)", boxShadow: "0 0 10px 2px rgba(74,144,217,0.7)" }}
          />
          <span
            className="absolute w-3 h-3 rounded-full animate-seesaw-b"
            style={{ right: "0%", top: "42%", background: "var(--accent)", boxShadow: "0 0 10px 2px rgba(74,144,217,0.7)" }}
          />
        </>
      )}

      {stageGroup === "done" && (
        <>
          <span
            className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold animate-badge-pop"
            style={{ background: "#2ECC71", boxShadow: "0 0 12px 3px rgba(46,204,113,0.6)" }}
          >
            ✓
          </span>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="absolute w-1 h-1 rounded-full bg-cyan-200 animate-sparkle-rise"
              style={{ left: `${28 + i * 22}%`, bottom: "8%", animationDelay: `${i * 0.4}s` }}
            />
          ))}
        </>
      )}
    </div>
  );
}
