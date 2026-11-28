import Image from "next/image";
import Mascot, { type MascotPose } from "./mascot";
import { cn } from "@/lib/utils";

export default function BrandScene({
  pose = "welcome",
  banner = false,
  priority = false,
}: {
  pose?: MascotPose;
  banner?: boolean;
  priority?: boolean;
}): React.ReactNode {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute overflow-hidden",
        banner ? "right-0 top-0 h-28 w-36 sm:h-full sm:w-[52%]" : "inset-0",
      )}
    >
      <Image
        src="/mascot/campus.webp"
        alt=""
        fill
        unoptimized
        priority={priority}
        className={cn(
          "object-cover object-right",
          banner && "opacity-75 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_70%),linear-gradient(to_bottom,black_74%,transparent)] sm:[mask-image:linear-gradient(to_right,transparent,black_70%)]",
        )}
      />
      <Mascot
        pose={pose}
        size={banner ? 192 : 320}
        decorative
        priority={priority}
        className={cn(
          "absolute object-contain",
          banner
            ? "right-1 top-1 h-[98%] w-auto max-w-28 sm:right-[7%] sm:top-[2%] sm:h-[96%] sm:max-w-48"
            : "inset-x-0 bottom-[14%] mx-auto h-auto max-h-[74%] w-[80%] max-w-72 drop-shadow-sm",
        )}
      />
    </div>
  );
}
