import React, { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Container, ISourceOptions } from "@tsparticles/engine";

type Props = {
    className?: string;
    density?: number; // mật độ hạt
    palette?: string[]; // bảng màu confetti
};

const ConfettiBackground: React.FC<Props> = ({
                                                 className,
                                                 density = 120,
                                                 palette = ["#FFD700", "#FF69B4", "#00BFFF", "#ADFF2F", "#FF4500"],
                                             }) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            // nạp gói nhẹ (đủ xài confetti)
            await loadSlim(engine);
        }).then(() => setReady(true));
    }, []);

    const options = useMemo<ISourceOptions>(() => {
        const prefersReduced =
            typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        return {
            fullScreen: false, // render trong div của chúng ta
            background: { color: "transparent" },
            detectRetina: true,
            fpsLimit: 60,
            particles: {
                number: { value: prefersReduced ? Math.max(40, density / 3) : density, density: { enable: true, area: 800 } },
                color: { value: palette },
                shape: { type: ["square", "circle", "triangle", "polygon"] },
                opacity: { value: 0.9, animation: { enable: false } },
                size: { value: { min: 3, max: 8 }, animation: { enable: false } },
                rotate: {
                    value: { min: 0, max: 360 },
                    direction: "random",
                    animation: { enable: true, speed: 30 },
                },
                move: {
                    enable: true,
                    speed: { min: 1, max: 6 },
                    direction: "bottom",
                    outModes: { default: "out" },
                    gravity: { enable: true, acceleration: 3 },
                    drift: 0,
                },
                tilt: {
                    enable: true,
                    value: { min: 0, max: 360 },
                    direction: "random",
                    animation: { enable: true, speed: 20 },
                },
            },
            interactivity: {
                detectsOn: "window",
                events: {
                    onHover: { enable: true, mode: "repulse" },
                    resize: true,
                },
                modes: {
                    repulse: { distance: 80, duration: 0.3 },
                },
            },
        };
    }, [density, palette]);

    if (!ready) return null;

    return (
        <div className={className}>
            <Particles id="confetti-bg" options={options} />
        </div>
    );
};

export default ConfettiBackground;
