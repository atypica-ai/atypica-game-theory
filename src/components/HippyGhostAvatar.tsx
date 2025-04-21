import proxiedImageLoader from "@/lib/proxiedImageLoader";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FC, HTMLAttributes } from "react";

const HippyGhostAvatar: FC<
  HTMLAttributes<HTMLDivElement> & { seed: number | string | undefined }
> = ({ seed, className }) => {
  // If seed is a string, convert it to a number
  const numericSeed =
    typeof seed === "string"
      ? seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      : typeof seed === "number"
        ? seed
        : 524;
  // Map the seed to a number in the range [200, 1500) using prime number multiplication
  const mapSeedToValue = (seed: number): number => {
    const largePrime1 = 7919; // A large prime number
    const largePrime2 = 6661; // Another large prime number
    const range = 1500 - 200;
    // Use the prime numbers to create a pseudo-random but deterministic mapping
    const hashValue = ((seed * largePrime1) % largePrime2) / largePrime2;
    // Map to the range [200, 1500)
    return Math.floor(200 + hashValue * range);
  };
  const tokenId = mapSeedToValue(numericSeed);
  const url = `https://api.hippyghosts.io/~/storage/images/raw/${tokenId}`;
  return (
    // 需要 overflow-hidden 以确保 Image 在 scale 后不会溢出容器
    <div
      className={cn(
        "relative size-8 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700",
        className,
      )}
    >
      <Image
        loader={proxiedImageLoader}
        src={url}
        alt="Hippy Ghost Avatar"
        fill
        sizes="100%"
        className="object-contain scale-115"
      />
    </div>
  );
};

export default HippyGhostAvatar;
