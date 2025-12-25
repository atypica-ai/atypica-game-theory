"use client";

import { proxiedImageLoader } from "@/lib/utils";
import Image from "next/image";

interface Props {
  bubbleText: string;
}

function PixelSpeechBubble({ text }: { text: string }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 294 196" className="w-full" preserveAspectRatio="xMidYMid meet">
        <polygon
          fill="black"
          points="280,28 280,14 266,14 266,0 252,0 238,0 224,0 210,0 196,0 182,0 168,0 154,0 140,0 126,0 112,0 98,0 84,0 70,0
          56,0 42,0 28,0 28,14 14,14 14,28 0,28 0,42 0,56 0,70 0,84 0,98 0,112 0,126 14,126 14,140 28,140 28,154 42,154 56,154 70,154
          70,168 56,168 56,182 42,182 42,196 56,196 70,196 84,196 98,196 98,182 112,182 112,168 126,168 126,154 140,154 154,154 168,154
          182,154 196,154 210,154 224,154 238,154 252,154 266,154 266,140 280,140 280,126 294,126 294,112 294,98 294,84 294,70 294,56
          294,42 294,28"
        />
        <polygon
          fill="white"
          points="266,28 266,14 252,14 238,14 224,14 210,14 196,14 182,14 168,14 154,14 140,14 126,14 112,14 98,14
          84,14 70,14 56,14 42,14 28,14 28,28 14,28 14,42 14,56 14,70 14,84 14,98 14,112 14,126 28,126 28,140 42,140 56,140 70,140
          70,154 84,154 84,168 70,168 70,182 84,182 98,182 98,168 112,168 112,154 126,154 126,140 140,140 154,140 168,140 182,140
          196,140 210,140 224,140 238,140 252,140 266,140 266,126 280,126 280,112 280,98 280,84 280,70 280,56 280,42 280,28"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pb-[22%]">
        <p className="text-xs md:text-sm font-bold text-center text-black px-4">{text}</p>
      </div>
    </div>
  );
}

function PixelIcon1({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 55 69" className="w-full h-full">
      <rect x="34.4" y="34.5" fill={color} width="6.9" height="6.9" />
      <polygon
        fill={color}
        points="48.1,13.8 48.1,6.9 41.2,6.9 41.2,0 20.6,0 20.6,41.4 6.9,41.4 6.9,48.3 0,48.3 0,62.1 6.9,62.1
        6.9,69 20.6,69 20.6,62.1 27.5,62.1 27.5,13.8 34.4,13.8 34.4,20.7 41.2,20.7 41.2,34.5 48.1,34.5 48.1,27.6 55,27.6 55,13.8"
      />
    </svg>
  );
}

function PixelIcon2({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 73.9 74.7" className="w-full h-full">
      <rect x="31.2" y="51.8" fill={color} width="11.5" height="23" />
      <rect y="31.7" fill={color} width="22.8" height="11.4" />
      <rect x="31.2" fill={color} width="11.5" height="23" />
      <rect x="51.1" y="31.7" fill={color} width="22.8" height="11.4" />
    </svg>
  );
}

function PixelIcon3({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 73 73" className="w-full h-full">
      <path
        fill={color}
        d="M24.3,0v40.6H8.1v8.1H0v16.2h8.1V73h16.2v-8.1h8.1V24.3h32.4v16.2H48.7v8.1h-8.1v16.2h8.1V73h16.2v-8.1H73V0
        H24.3z M64.9,16.2H32.4V8.1h32.4V16.2z"
      />
    </svg>
  );
}

// Icon 4 - 基于 ec0bf1cbdc27178d54b82c5c684197a5.svg
function PixelIcon4({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 73.9 74.7" className="w-full h-full">
      <path
        fill={color}
        d="M62.4,31.7v11.4h11.5V31.7H62.4z M0,43.1h11.5V31.7H0V43.1z M31.2,74.7h11.5V63.1H31.2V74.7z M31.2,11.7h11.5
        V0H31.2V11.7z"
      />
    </svg>
  );
}

export function AffiliateHeroGhosts({ bubbleText }: Props) {
  return (
    <>
      <style jsx>{`
        @keyframes fade-in {
          0%,
          100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 3s ease-in-out infinite;
        }
        @keyframes shining {
          0% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        .shining {
          animation: shining 3s linear 0s infinite;
          opacity: 0;
        }
        .shining-1 {
          animation: shining 3s linear 1s infinite;
          opacity: 0;
        }
        .shining-2 {
          animation: shining 3s linear 2s infinite;
          opacity: 0;
        }
      `}</style>

      <div className="relative w-full aspect-4/3">
        {/* Ghost 1 - 左下 */}
        <div className="absolute left-[4%] top-[26%] w-[40%] scale-x-[-1]">
          <div className="relative w-full aspect-square">
            <Image
              loader={proxiedImageLoader}
              src="https://api.hippyghosts.io/~/storage/images/raw/706"
              alt="Ghost 1"
              fill
              sizes="200px"
              className="object-contain scale-150 origin-[50%_30%]"
            />
          </div>
        </div>

        {/* Ghost 2 - 右下，水平翻转 */}
        <div className="absolute right-[8%] top-[27%] w-[40%]">
          <div className="relative w-full aspect-square">
            <Image
              loader={proxiedImageLoader}
              src="https://api.hippyghosts.io/~/storage/images/raw/358"
              alt="Ghost 2"
              fill
              sizes="200px"
              className="object-contain scale-150 origin-[50%_30%]"
            />
          </div>
        </div>

        {/* 对话气泡 - 像素风格 */}
        <div className="absolute top-[5%] left-[28%] w-[44%]">
          <PixelSpeechBubble text={bubbleText} />
        </div>

        {/* Icon 1 - 左中，蓝色 */}
        <div className="absolute left-[0%] top-[25%] w-8 h-8 shining">
          <PixelIcon1 color="#60A5FA" />
        </div>

        {/* Icon 2 - 中下，红色 */}
        <div className="absolute right-[50%] bottom-[15%] w-8 h-8 shining">
          <PixelIcon2 color="#EF4444" />
        </div>

        {/* Icon 3 - 右上，红色 */}
        <div className="absolute right-[12%] top-[5%] w-8 h-8 shining-1">
          <PixelIcon3 color="#F64C44" />
        </div>

        {/* Icon 4 - 左上，蓝色 */}
        <div className="absolute left-[20%] top-[0%] w-8 h-8 shining-2">
          <PixelIcon4 color="#6699FF" />
        </div>
      </div>
    </>
  );
}
