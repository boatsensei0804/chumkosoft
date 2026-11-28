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
        banner ? "hidden inset-y-0 end-0 w-24 @xs:block @sm:w-28 @lg:w-36 @3xl:w-[52%]" : "inset-0",
      )}
    >
      <Image
        src="/mascot/campus-v2.webp"
        alt=""
        fill
        unoptimized
        priority={priority}
        className={cn(
          "object-cover object-right",
          banner && "hidden opacity-75 [mask-image:linear-gradient(to_right,transparent,black_70%)] @3xl:block",
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
            ? "end-2 top-1/2 size-24 -translate-y-1/2 @sm:size-28 @lg:end-4 @lg:size-32 @3xl:end-[7%] @3xl:size-44"
            : "inset-x-0 bottom-[14%] mx-auto h-auto max-h-[74%] w-[80%] max-w-72 drop-shadow-sm",
        )}
      />
    </div>
  );
}
