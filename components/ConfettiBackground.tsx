import React, { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { ISourceOptions } from "@tsparticles/engine";

type Props = {
    className?: string;
    density?: number;   // không còn dùng cho pháo hoa, vẫn giữ để không phá API
    palette?: string[]; // bảng màu pháo hoa
};

const ConfettiBackground: React.FC<Props> = ({
                                                 className,
                                                 density = 120,
                                                 palette = ["#FFD700", "#FF69B4", "#00BFFF", "#ADFF2F", "#FF4500"],
                                             }) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            // Slim đủ nhẹ, thường vẫn chạy emitters/split trên bản modern.
            // Nếu máy bạn không thấy pháo hoa, mình sẽ nói cách bật full ở cuối.
            await loadSlim(engine);
        }).then(() => setReady(true));
    }, []);

    const options = useMemo<ISourceOptions>(() => {
        // Hiệu ứng FIREWORKS: bắn hạt lên, khi "chết" thì nổ thành nhiều tia và tàn bay xuống.
        return {
            fullScreen: false,
            background: { color: "transparent" },
            detectRetina: true,
            fpsLimit: 60,

            // Không render hạt nền liên tục — chỉ bắn từ emitters
            particles: {
                number: { value: 0 },
                // cấu hình hạt "pháo" (rocket) mặc định (đề phòng emitters không override)
                color: { value: palette },
                life: { count: 1, duration: { value: 1.5 } },
                move: {
                    enable: true,
                    direction: "top",
                    speed: { min: 12, max: 18 },
                    gravity: { enable: true, acceleration: 9.81, maxSpeed: 70 },
                    outModes: { default: "destroy" },
                },
                size: { value: 3 },
                opacity: { value: 1 },
                // Khi rocket “chết” → nổ (split) ra các tia pháo nhỏ
                destroy: {
                    mode: "split",
                    split: {
                        count: 1,
                        factor: { value: { min: 2, max: 3 } }, // hệ số tách
                        rate: { value: 40 },                   // số tia sinh ra
                        particles: {
                            color: { value: palette },
                            shape: { type: ["circle", "square", "triangle", "polygon"] },
                            size: { value: { min: 1, max: 3 } },
                            opacity: {
                                value: { min: 0.8, max: 1 },
                                animation: { enable: true, startValue: "max", destroy: "min", speed: 1 },
                            },
                            life: { count: 1, duration: { value: { min: 0.5, max: 0.9 } } },
                            move: {
                                enable: true,
                                direction: "none",
                                speed: { min: 6, max: 14 },
                                decay: 0.08, // chậm dần
                                gravity: { enable: true, acceleration: 9.81, maxSpeed: 90 },
                                outModes: { default: "destroy" },
                            },
                            rotate: {
                                value: { min: 0, max: 360 },
                                direction: "random",
                                animation: { enable: true, speed: 30 },
                            },
                            tilt: {
                                enable: true,
                                value: { min: 0, max: 360 },
                                direction: "random",
                                animation: { enable: true, speed: 20 },
                            },
                            shadow: { enable: false },
                        },
                    },
                },
            },

            // Bệ phóng: nhiều emitter rải rộng theo chiều ngang đáy header
            emitters: [
                {
                    position: { x: 15, y: 100 },      // % theo container
                    rate: { delay: 0.25, quantity: 1 },
                    life: { count: 0 },
                    size: { width: 0, height: 0 },
                    direction: "top",
                    particles: {
                        // override rocket để bắn hơi lệch cho tự nhiên
                        move: { angle: { offset: 0, value: { min: -15, max: 15 } } },
                    },
                },
                {
                    position: { x: 50, y: 100 },
                    rate: { delay: 0.2, quantity: 1 },
                    life: { count: 0 },
                    size: { width: 0, height: 0 },
                    direction: "top",
                    particles: {
                        move: { angle: { offset: 0, value: { min: -10, max: 10 } } },
                    },
                },
                {
                    position: { x: 85, y: 100 },
                    rate: { delay: 0.3, quantity: 1 },
                    life: { count: 0 },
                    size: { width: 0, height: 0 },
                    direction: "top",
                    particles: {
                        move: { angle: { offset: 0, value: { min: -15, max: 15 } } },
                    },
                },
            ],

            interactivity: {
                events: {
                    onHover: { enable: false, mode: [] }, // pháo hoa nền, không cần repulse
                    resize: true,
                    onClick: { enable: true, mode: "push" }, // click để bắn nhanh hơn
                },
                modes: { push: { quantity: 2 } },
            },
        };
    }, [palette, density]);

    if (!ready) return null;

    return (
        <div className={className}>
            <Particles id="confetti-bg" options={options} />
        </div>
    );
};

export default ConfettiBackground;
