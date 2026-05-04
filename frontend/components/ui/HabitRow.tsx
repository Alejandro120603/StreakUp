"use client";

import { Check, Eye } from "lucide-react";
import type { ReactNode } from "react";

interface HabitRowProps {
  icon: ReactNode;
  name: string;
  subtitle: string;
  checked: boolean;
  onToggle: () => void;
  onView?: () => void;
  pending?: boolean;
}

export function HabitRow({ icon, name, subtitle, checked, onToggle, onView, pending }: HabitRowProps) {
  return (
    <div className="flex items-center gap-[14px] mb-[12px] p-[16px] rounded-[24px] bg-white/13 border border-white/20">
      <div className="w-[58px] h-[58px] rounded-[18px] bg-white/18 grid place-items-center text-[34px] text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-[18px] font-bold leading-tight">{name}</h3>
        <p className="text-white/74 text-[13px]">
          {pending ? <span className="text-yellow-300 mr-1" aria-label="Pendiente de sincronización">⏳</span> : null}
          {subtitle}
        </p>
      </div>
      <div className="flex gap-[8px]">
        {onView && (
          <button
            onClick={onView}
            className="w-[40px] h-[40px] rounded-full bg-white/18 text-white grid place-items-center cursor-pointer transition-transform active:scale-95 hover:bg-white/25"
          >
            <Eye className="size-5" />
          </button>
        )}
        <button
          onClick={onToggle}
          className={`w-[40px] h-[40px] rounded-full grid place-items-center cursor-pointer transition-all active:scale-95 ${
            checked ? "bg-[#36d98f] text-white" : "bg-white/18 text-white hover:bg-white/25"
          }`}
        >
          {checked ? <Check className="size-5" /> : <span className="text-xl leading-none">○</span>}
        </button>
      </div>
    </div>
  );
}
