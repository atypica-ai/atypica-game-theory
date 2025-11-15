"use client";
import { cn, proxiedImageLoader } from "@/lib/utils";
import Image from "next/image";
import { FC, HTMLAttributes } from "react";

const HippyGhostAvatar: FC<
  HTMLAttributes<HTMLDivElement> & {
    seed?: number | string | null;
    tokenId?: number;
  }
> = ({ seed, tokenId, className }) => {
  if (!tokenId) {
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
    tokenId = mapSeedToValue(numericSeed);
  }
  const url = `https://api.hippyghosts.io/~/storage/images/raw/${tokenId}`;
  return (
    // 需要 overflow-hidden 以确保 Image 在 scale 后不会溢出容器
    <div
      className={cn(
        "relative size-8 overflow-hidden",
        // "bg-zinc-50 dark:bg-zinc-800",
        // "rounded-full",
        className,
      )}
    >
      <Image
        loader={proxiedImageLoader}
        src={url}
        alt="Hippy Ghost Avatar"
        fill
        sizes="100px" // fill 模式下, 不能写 100%, 否则 nextjs 会按照 100vw 来构建 imageloader 上的 w 参数，这里其实最大 100px 够了
        className="object-contain scale-150 origin-[50%_30%]"
      />
    </div>
  );
};

export default HippyGhostAvatar;
