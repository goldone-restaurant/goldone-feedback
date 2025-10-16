// AquariumBackground.tsx
import React, { useEffect, useMemo } from "react";
import TropicalFishIcon from './icons/TropicalFishIcon';
import CrabIcon from './icons/CrabIcon';

type Props = {
    className?: string;
    fishCount?: number;      // số cá
    crabCount?: number;      // số cua
    minSpeedSec?: number;    // tốc độ bơi tối thiểu (giây/chu kỳ)
    maxSpeedSec?: number;    // tốc độ bơi tối đa
    startDelayMax?: number;  // trễ bắt đầu tối đa
    bubbles?: boolean;       // bật hiệu ứng bong bóng
    pauseOnHover?: boolean;  // hover để tạm dừng
    dim?: boolean;           // phủ lớp tối mờ để chữ phía trước dễ đọc
};

const AquariumBackground: React.FC<Props> = ({
                                                 className,
                                                 fishCount = 6,
                                                 crabCount = 2,
                                                 minSpeedSec = 18,
                                                 maxSpeedSec = 34,
                                                 startDelayMax = 22,
                                                 bubbles = true,
                                                 pauseOnHover = true,
                                                 dim = false,
                                             }) => {
    const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // tạo danh sách “sinh vật” ngay lần mount đầu
    const creatures = useMemo(() => {
        const list: Array<{
            id: string;
            type: "fish" | "crab";
            style: React.CSSProperties;
            reverse: boolean;
        }> = [];

        const rand = (a: number, b: number) => a + Math.random() * (b - a);

        // cá
        for (let i = 0; i < fishCount; i++) {
            const size = Math.round(rand(28, 64)); // px
            const reverse = Math.random() > 0.5;
            list.push({
                id: `fish-${i}`,
                type: "fish",
                reverse,
                style: {
                    top: `${rand(8, 80)}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    animationName: reverse ? "swim-reverse" : "swim",
                    animationDuration: `${rand(minSpeedSec, maxSpeedSec)}s`,
                    animationDelay: `${rand(0, startDelayMax)}s`,
                    animationIterationCount: "infinite",
                    animationFillMode: "backwards",
                    opacity: rand(0.7, 1),
                },
            });
        }

        // cua
        for (let i = 0; i < crabCount; i++) {
            const size = Math.round(rand(36, 68));
            const reverse = Math.random() > 0.5;
            list.push({
                id: `crab-${i}`,
                type: "crab",
                reverse,
                style: {
                    width: `${size}px`,
                    height: `${size}px`,
                    bottom: `${rand(2, 6)}%`,
                    animationName: reverse ? "scuttle-reverse" : "scuttle",
                    animationDuration: `${rand(minSpeedSec + 6, maxSpeedSec + 10)}s`,
                    animationDelay: `${rand(0, startDelayMax)}s`,
                    animationIterationCount: "infinite",
                    animationFillMode: "backwards",
                    opacity: rand(0.75, 1),
                },
            });
        }

        return list;
    }, [fishCount, crabCount, minSpeedSec, maxSpeedSec, startDelayMax]);

    // nếu user chọn giảm chuyển động, tắt animation
    useEffect(() => {
        if (!prefersReduced) return;
        const els = document.querySelectorAll(".aq-creature");
        els.forEach((el) => {
            (el as HTMLElement).style.animation = "none";
        });
    }, [prefersReduced]);

    return (
        <div
            className={className}
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                zIndex: 0,
                pointerEvents: "none",
                background:
                    "linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 35%, rgba(8,47,73,1) 100%)", // deep sea
            }}
        >
            {/* layer cá/cua */}
            <div
                className={`absolute inset-0 ${pauseOnHover ? "aq-pause-on-hover" : ""}`}
                style={{ pointerEvents: "none" }}
            >
                {creatures.map((c) =>
                    c.type === "fish" ? (
                        <TropicalFishIcon
                            key={c.id}
                            className="aq-creature absolute"
                            style={c.style}
                        />
                    ) : (
                        <CrabIcon
                            key={c.id}
                            className="aq-creature absolute"
                            style={c.style}
                        />
                    )
                )}
            </div>

            {/* bubbles */}
            {bubbles && !prefersReduced && (
                <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute bottom-0 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                width: `${2 + Math.random() * 5}px`,
                                height: `${2 + Math.random() * 5}px`,
                                background: "rgba(250, 204, 21, 0.18)",
                                animation: `bubble ${5 + Math.random() * 8}s linear infinite`,
                                animationDelay: `${Math.random() * 10}s`,
                                filter: "blur(0.2px)",
                            }}
                        />
                    ))}
                </div>
            )}

            {/* dim layer giúp chữ phía trước nổi bật */}
            {dim && (
                <div
                    className="absolute inset-0"
                    style={{ background: "rgba(0,0,0,0.25)" }}
                />
            )}

            {/* CSS keyframes nội bộ */}
            <style>{`
        .aq-pause-on-hover:hover .aq-creature { animation-play-state: paused; }

        @keyframes swim {
          0%   { transform: translateX(-110px) translateY(20px) rotate(-5deg); }
          50%  { transform: translateX(40vw)   translateY(-20px) rotate(5deg); }
          100% { transform: translateX(90vw)   translateY(20px) rotate(-5deg); }
        }
        @keyframes swim-reverse {
          0%   { transform: translateX(90vw)   translateY(-20px) rotate(5deg) scaleX(-1); }
          50%  { transform: translateX(40vw)   translateY(20px) rotate(-5deg) scaleX(-1); }
          100% { transform: translateX(-110px) translateY(-20px) rotate(5deg) scaleX(-1); }
        }
        @keyframes scuttle {
          0%   { transform: translateX(-120px) scaleX(1); }
          48%  { transform: translateX(40vw)   scaleX(1); }
          52%  { transform: translateX(44vw)   scaleX(-1); }
          100% { transform: translateX(92vw)   scaleX(-1); }
        }
        @keyframes scuttle-reverse {
          0%   { transform: translateX(92vw)   scaleX(-1); }
          48%  { transform: translateX(44vw)   scaleX(-1); }
          52%  { transform: translateX(40vw)   scaleX(1); }
          100% { transform: translateX(-120px) scaleX(1); }
        }
        @keyframes bubble {
          0%   { transform: translateY(0);      opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-160px); opacity: 0; }
        }
      `}</style>
        </div>
    );
};

export default AquariumBackground;
