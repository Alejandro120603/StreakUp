import type { Quote } from "@/types/quotes";

interface QuoteCardProps {
  quote: Quote | null;
  loading: boolean;
}

export function QuoteCard({ quote, loading }: QuoteCardProps) {
  if (!loading && !quote) return null;

  return (
    <div className="bg-white/14 border border-white/20 rounded-[28px] shadow-[0_22px_55px_rgba(18,5,72,0.32)] backdrop-blur-[18px] px-[22px] py-[20px]">
      <p className="text-[13px] text-white/74 mb-[10px]">Frase del día</p>
      {loading ? (
        <div className="space-y-[10px]">
          <div className="h-4 w-full rounded animate-pulse bg-white/20" />
          <div className="h-4 w-4/5 rounded animate-pulse bg-white/20" />
          <div className="h-3 w-2/5 rounded animate-pulse bg-white/20 mt-[14px]" />
        </div>
      ) : (
        <>
          <p className="text-[17px] leading-snug font-medium">&ldquo;{quote!.quote}&rdquo;</p>
          <p className="text-[13px] text-white/74 mt-[10px]">— {quote!.author}</p>
        </>
      )}
    </div>
  );
}
