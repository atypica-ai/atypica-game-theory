"use client";

import { useEffect, useState } from "react";

interface CityPoint {
  id: number;
  x: number; // percentage
  y: number; // percentage
  delay: number; // animation delay in seconds
  pulseDelay: number; // pulse animation delay
}

// Major cities coordinates (approximate percentages for world map)
const CITIES: Array<{ name: string; x: number; y: number }> = [
  { name: "San Francisco", x: 15, y: 35 },
  { name: "New York", x: 25, y: 38 },
  { name: "London", x: 48, y: 32 },
  { name: "Tokyo", x: 78, y: 38 },
  { name: "Shanghai", x: 72, y: 40 },
  { name: "Singapore", x: 72, y: 55 },
  { name: "Sydney", x: 82, y: 70 },
  { name: "Berlin", x: 50, y: 33 },
  { name: "Paris", x: 48, y: 34 },
  { name: "Mumbai", x: 65, y: 48 },
  { name: "São Paulo", x: 30, y: 68 },
  { name: "Dubai", x: 58, y: 45 },
];

export function WorldMapBackground() {
  const [cityPoints, setCityPoints] = useState<CityPoint[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Generate city points with random delays
    const points: CityPoint[] = CITIES.map((city, index) => ({
      id: index,
      x: city.x,
      y: city.y,
      delay: Math.random() * 2,
      pulseDelay: Math.random() * 3,
    }));
    setCityPoints(points);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* World Map SVG - Simple outline style */}
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
        style={{ opacity: 0.5 }}
      >
        {/* Simplified world map paths - terminal style, minimal */}
        <g stroke="rgba(0, 255, 65, 0.6)" strokeWidth="2" fill="none" className="world-continent">
          {/* North America - More detailed outline */}
          <path
            d="M 120 80 L 180 60 L 240 70 L 280 90 L 320 120 L 340 160 L 320 200 L 280 230 L 240 250 L 200 260 L 160 250 L 130 220 L 110 180 L 100 140 Z"
          />
          {/* South America */}
          <path
            d="M 240 240 L 280 220 L 320 250 L 330 300 L 320 350 L 300 400 L 270 420 L 240 410 L 220 380 L 210 340 L 220 290 Z"
          />
          {/* Europe */}
          <path
            d="M 440 60 L 500 50 L 560 60 L 600 80 L 610 120 L 590 160 L 550 180 L 500 170 L 450 150 L 420 120 L 410 90 Z"
          />
          {/* Africa */}
          <path
            d="M 480 140 L 540 130 L 600 150 L 640 200 L 650 280 L 630 340 L 600 380 L 560 400 L 520 390 L 490 360 L 480 300 L 490 240 Z"
          />
          {/* Asia - Larger continent */}
          <path
            d="M 580 40 L 720 30 L 840 60 L 900 100 L 920 160 L 900 220 L 860 260 L 780 280 L 680 270 L 600 240 L 560 200 L 540 150 L 550 100 Z"
          />
          {/* India subcontinent */}
          <path
            d="M 650 200 L 680 180 L 700 220 L 690 260 L 670 280 L 640 270 L 630 240 Z"
          />
          {/* Australia */}
          <path
            d="M 820 300 L 880 290 L 920 310 L 910 350 L 880 380 L 840 390 L 810 370 L 800 340 Z"
          />
          {/* Japan */}
          <path
            d="M 880 200 L 900 190 L 920 210 L 910 230 L 890 240 L 870 230 Z"
          />
          {/* British Isles */}
          <path
            d="M 470 100 L 490 95 L 500 110 L 485 120 L 470 115 Z"
          />
        </g>

        {/* Connection lines between cities (subtle) */}
        <g stroke="rgba(0, 255, 65, 0.1)" strokeWidth="0.3" strokeDasharray="2,2">
          {cityPoints.slice(0, 6).map((point, i) => {
            const nextPoint = cityPoints[(i + 1) % 6];
            if (!nextPoint) return null;
            return (
              <line
                key={`line-${i}`}
                x1={`${point.x}%`}
                y1={`${point.y}%`}
                x2={`${nextPoint.x}%`}
                y2={`${nextPoint.y}%`}
                className="connection-line"
                style={{
                  animation: `fadeInOut 4s ease-in-out infinite`,
                  animationDelay: `${point.delay}s`,
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Animated city points */}
      {cityPoints.map((point) => (
        <div
          key={point.id}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${point.x}%`,
            top: `${point.y}%`,
          }}
        >
          {/* Outer glow ring */}
          <div
            className="absolute w-3 h-3 rounded-full border border-primary/40"
            style={{
              animation: `pulseGlow 3s ease-in-out infinite`,
              animationDelay: `${point.pulseDelay}s`,
            }}
          />
          {/* Inner point */}
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-primary"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              boxShadow: `0 0 4px rgba(0, 255, 65, 0.8), 0 0 8px rgba(0, 255, 65, 0.4)`,
              animation: `pointShine 2s ease-in-out infinite`,
              animationDelay: `${point.delay}s`,
            }}
          />
        </div>
      ))}

      {/* Easter Egg 1: UFO */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: "35%",
          top: "25%",
          animation: `ufoFloat 8s ease-in-out infinite`,
        }}
      >
        <svg width="20" height="12" viewBox="0 0 20 12" className="text-primary">
          {/* UFO body */}
          <ellipse cx="10" cy="6" rx="8" ry="3" fill="currentColor" opacity="0.6" />
          <ellipse cx="10" cy="5" rx="6" ry="2" fill="currentColor" opacity="0.8" />
          {/* UFO lights */}
          <circle cx="7" cy="5" r="0.8" fill="rgba(0, 255, 65, 1)" className="ufo-light-1" />
          <circle cx="10" cy="5" r="0.8" fill="rgba(0, 255, 65, 1)" className="ufo-light-2" />
          <circle cx="13" cy="5" r="0.8" fill="rgba(0, 255, 65, 1)" className="ufo-light-3" />
          {/* Beam */}
          <rect
            x="9"
            y="8"
            width="2"
            height="4"
            fill="rgba(0, 255, 65, 0.3)"
            className="ufo-beam"
          />
        </svg>
      </div>

      {/* Easter Egg 2: Satellite */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: "65%",
          top: "20%",
          animation: `satelliteOrbit 12s linear infinite`,
        }}
      >
        <div className="relative">
          {/* Glow ring */}
          <div
            className="absolute w-12 h-12 rounded-full border border-primary/30 -left-6 -top-6"
            style={{
              animation: `satelliteGlow 2s ease-in-out infinite`,
            }}
          />
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-primary relative z-10">
            {/* Satellite body */}
            <rect x="6" y="6" width="4" height="4" fill="currentColor" opacity="0.7" />
            {/* Solar panels */}
            <rect x="2" y="7" width="3" height="2" fill="currentColor" opacity="0.5" />
            <rect x="11" y="7" width="3" height="2" fill="currentColor" opacity="0.5" />
            {/* Antenna */}
            <line
              x1="8"
              y1="6"
              x2="8"
              y2="3"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.6"
            />
            <circle cx="8" cy="2.5" r="0.5" fill="currentColor" opacity="0.8" />
          </svg>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulseGlow {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.4;
          }
          50% {
            transform: translate(-50%, -50%) scale(2.5);
            opacity: 0;
          }
        }

        @keyframes pointShine {
          0%,
          100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @keyframes fadeInOut {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes ufoFloat {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0px);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-15px);
          }
        }

        @keyframes satelliteOrbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(30px) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(30px) rotate(-360deg);
          }
        }

        .ufo-light-1 {
          animation: ufoLightBlink 1.5s ease-in-out infinite;
        }
        .ufo-light-2 {
          animation: ufoLightBlink 1.5s ease-in-out infinite 0.5s;
        }
        .ufo-light-3 {
          animation: ufoLightBlink 1.5s ease-in-out infinite 1s;
        }

        @keyframes ufoLightBlink {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }

        .ufo-beam {
          animation: beamPulse 2s ease-in-out infinite;
        }

        @keyframes beamPulse {
          0%,
          100% {
            opacity: 0.2;
            height: 4px;
          }
          50% {
            opacity: 0.4;
            height: 6px;
          }
        }

        @keyframes satelliteGlow {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.3);
          }
        }

        .world-continent {
          animation: continentGlow 6s ease-in-out infinite;
        }

        @keyframes continentGlow {
          0%,
          100% {
            stroke-opacity: 0.5;
          }
          50% {
            stroke-opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

