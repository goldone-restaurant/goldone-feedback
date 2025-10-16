// AquariumBackground.tsx
import React, { useEffect, useMemo } from "react";
import TropicalFishIcon from "./icons/TropicalFishIcon";
import CrabIcon from "./icons/CrabIcon";

type Props = {
    className?: string;
    fishCount?: number;      // số cá
    crabCount?: number;      // số cua (giữ option, mặc định ít)
    bubbles?: boolean;       // bật hiệu ứng bong bóng
    pauseOnHover?: boolean;  // hover để tạm dừng
    dim?: boolean;           // phủ lớp tối mờ để chữ phía trước dễ đọc
};

const AquariumBackground: React.FC<Props> = ({
                                                 className,
                                                 fishCount = 24,
                                                 crabCount = 1,
                                                 bubbles = true,
                                                 pauseOnHover = true,
                                                 dim = false,
                                             }) => {
    const prefersReduced =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const creatures = useMemo(() => {
        const list: Array<{
            id: string;
            type: "fish" | "crab";
            style: React.CSSProperties;
            reverse: boolean;
        }> = [];

        const rand = (a: number, b: number) => a + Math.random() * (b - a);

        // cá — nhiều con, kích thước đa dạng, KHÔNG delay
        for (let i = 0; i < fishCount; i++) {
            const size = Math.round(rand(16, 110)); // px — nhỏ tới rất to
            const reverse = Math.random() > 0.5;

            // con càng to bơi càng chậm (độ dài chu kỳ lớn hơn)
            const minDur = 12;  // s
            const maxDur = 36;  // s
            const dur = Math.round(
                minDur + (1 - (size - 16) / (110 - 16)) * (maxDur - minDur)
            ); // map size -> duration ngược

            // mỗi con bắt đầu ở vị trí ngang ngẫu nhiên để tránh “đồng bộ pha”
            // (dù delay = 0, nhưng top/dir/duration khác nhau nhìn vẫn tự nhiên)
            const initialOffset = reverse ? rand(0, 90) : rand(0, 90); // vw

            list.push({
                id: `fish-${i}`,
                type: "fish",
                reverse,
                style: {
                    top: `${rand(6, 86)}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    left: reverse ? "auto" : `calc(${initialOffset}vw)`,
                    right: reverse ? `calc(${initialOffset}vw)` : "auto",
                    animationName: reverse ? "swim-reverse" : "swim",
                    animationDuration: `${dur}s`,
                    animationDelay: "0s", // KHÔNG CHỜ
                    animationTimingFunction: "linear",
                    animationIterationCount: "infinite",
                    animationFillMode: "backwards",
                    opacity: rand(0.7, 1),
                    willChange: "transform",
                },
            });
        }

        // cua — để ít thôi cho đỡ rối, KHÔNG delay
        for (let i = 0; i < crabCount; i++) {
            const size = Math.round(rand(36, 68));
            const reverse = Math.random() > 0.5;
            const dur = Math.round(rand(26, 40)); // chậm và đều
            list.push({
                id: `crab-${i}`,
                type: "crab",
                reverse,
                style: {
                    width: `${size}px`,
                    height: `${size}px`,
                    bottom: `${rand(2, 6)}%`,
                    animationName: reverse ? "scuttle-reverse" : "scuttle",
                    animationDuration: `${dur}s`,
                    animationDelay: "0s", // KHÔNG CHỜ
                    animationTimingFunction: "linear",
                    animationIterationCount: "infinite",
                    animationFillMode: "backwards",
                    opacity: rand(0.8, 1),
                    willChange: "transform",
                },
            });
        }

        return list;
    }, [fishCount, crabCount]);

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
                    "linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(15,23,42,1) 35%, rgba(8,47,73,1) 100%)",
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
                    {Array.from({ length: 22 }).map((_, i) => (
                        <div
                            key={i}
                            className="absolute bottom-0 rounded-full"
                            style={{
                                left: `${Math.random() * 100}%`,
                                width: `${2 + Math.random() * 5}px`,
                                height: `${2 + Math.random() * 5}px`,
                                background: "rgba(250, 204, 21, 0.18)",
                                animation: `bubble ${5 + Math.random() * 8}s linear infinite`,
                                animationDelay: `${Math.random() * 2}s`, // bóng có thể lệch nhẹ cho tự nhiên
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

            {/* CSS keyframes */}
            <style>{`
        .aq-pause-on-hover:hover .aq-creature { animation-play-state: paused; }

        /* Bơi từ trái -> phải, luôn chạy ngay lập tức */
        @keyframes swim {
          0%   { transform: translateX(-120px) translateY(12px) rotate(-5deg); }
          50%  { transform: translateX(43vw)   translateY(-18px) rotate(5deg); }
          100% { transform: translateX(100vw)  translateY(12px) rotate(-5deg); }
        }
        /* Bơi từ phải -> trái, lật trục X để quay đầu */
        @keyframes swim-reverse {
          0%   { transform: translateX(100vw)  translateY(-18px) rotate(5deg)  scaleX(-1); }
          50%  { transform: translateX(43vw)   translateY(12px)  rotate(-5deg) scaleX(-1); }
          100% { transform: translateX(-120px) translateY(-18px) rotate(5deg)  scaleX(-1); }
        }

        /* Cua chạy sát đáy */
        @keyframes scuttle {
          0%   { transform: translateX(-140px) scaleX(1); }
          48%  { transform: translateX(44vw)   scaleX(1); }
          52%  { transform: translateX(48vw)   scaleX(-1); }
          100% { transform: translateX(102vw)  scaleX(-1); }
        }
        @keyframes scuttle-reverse {
          0%   { transform: translateX(102vw)  scaleX(-1); }
          48%  { transform: translateX(48vw)   scaleX(-1); }
          52%  { transform: translateX(44vw)   scaleX(1); }
          100% { transform: translateX(-140px) scaleX(1); }
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
