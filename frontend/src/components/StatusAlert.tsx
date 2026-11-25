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
      className="cw-card flex flex-col sm:flex-row sm:items-center justify-between gap-[16px] p-[16px]"
      style={{
        borderColor: isError ? "var(--color-1)" : "var(--color-4)",
        backgroundColor: isError ? "var(--color-7)" : "var(--color-6)",
      }}
    >
      <div className="flex items-start gap-[10px]">
        {isError ? (
          <AlertCircle size={18} className="shrink-0 mt-[2px]" color="#121317" />
        ) : (
          <Info size={18} className="shrink-0 mt-[2px]" color="#45474D" />
        )}
        <div>
          <p className="text-[15px] font-medium text-[#121317] m-0">{title}</p>
          <p className="text-[13px] text-[#45474D] mt-[4px] mb-0">{message}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
