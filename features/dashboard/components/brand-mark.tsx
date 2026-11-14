import Mascot from "@/components/ui/mascot";

export default function BrandMark({ showWordmark = true }: { showWordmark?: boolean }): React.ReactNode {
  return <div className="flex items-center gap-2.5"><Mascot pose="welcome" size={48} decorative />{showWordmark && <span className="flex flex-col"><span className="text-[18px] font-bold tracking-tight text-brand-ink">chumkosoft</span><span className="text-[10px] font-medium text-muted">โรงเรียนที่เชื่อมถึงกัน</span></span>}</div>;
}
