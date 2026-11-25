import { AlertCircle, Info } from "lucide-react";
import type { ReactNode } from "react";

export function StatusAlert({
  title,
  message,
  variant = "info",
  action,
}: {
  title: string;
  message: string;
  variant?: "info" | "error";
  action?: ReactNode;
}) {
  const isError = variant === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[18px] backdrop-blur-xl transition-all"
      style={{
        border: isError
          ? "1px solid rgba(244, 63, 94, 0.34)"
          : "1px solid rgba(96, 165, 250, 0.38)",
        background: isError
          ? "linear-gradient(135deg, rgba(255, 228, 230, 0.85), rgba(255, 241, 242, 0.72))"
          : "linear-gradient(135deg, rgba(224, 238, 255, 0.78), rgba(240, 246, 255, 0.68))",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 8px 24px -10px rgba(15, 23, 42, 0.08)",
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 mt-0.5"
          style={{
            backgroundColor: isError ? "rgba(225, 29, 72, 0.12)" : "rgba(37, 99, 235, 0.12)",
            color: isError ? "#BE123C" : "#1D4ED8",
          }}
        >
          {isError ? <AlertCircle size={17} /> : <Info size={17} />}
        </span>
        <div className="space-y-0.5">
          <p className="text-[14.5px] font-semibold text-[#0F172A]">{title}</p>
          <p className="text-[13.5px] text-[#334155] leading-relaxed">{message}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
