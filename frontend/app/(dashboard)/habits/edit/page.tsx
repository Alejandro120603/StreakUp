"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function EditHabitPage() {
  const router = useRouter();

  return (
    <div className="pt-6 pb-4 max-w-lg mx-auto px-4">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/habits"
          className="flex items-center justify-center size-10 rounded-lg text-white hover:bg-[#1A1A2E] transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-bold text-white flex-1 text-center pr-10">
          Editar hábito
        </h1>
      </div>

      <div className="border-t border-[#2A2A3E] mb-6" />

      <div className="rounded-xl border border-[#2A2A3E] bg-[#111127] p-5 space-y-4">
        <p className="text-white font-semibold">Los hábitos predeterminados no se editan.</p>
        <p className="text-sm text-muted-foreground">
          Para cambiar tu rutina, desactiva el hábito actual y agrega otro desde el catálogo.
        </p>
        <button
          onClick={() => router.push("/habits")}
          className="w-full h-11 rounded-xl bg-[#5D5FEF] hover:bg-[#4B4DDC] text-white font-semibold transition-colors"
        >
          Volver a hábitos
        </button>
      </div>
    </div>
  );
}
