"use client";

import { useEffect, useRef } from "react";

const cubeSize = 100;
const faceSize = cubeSize / 2;

export function RubiksCube() {
  const cubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cube = cubeRef.current;
    if (!cube) return;

    let rotationX = 0;
    let rotationY = 0;
    let animationId: number;

    const animate = () => {
      rotationX += 0.5;
      rotationY += 0.3;
      cube.style.transform = `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  const Face = ({ transform, colors }: { transform: string; colors: string[] }) => (
    <div
      className="absolute"
      style={{
        width: `${cubeSize}px`,
        height: `${cubeSize}px`,
        transform,
        transformStyle: "preserve-3d",
      }}
    >
      <div className="grid grid-cols-3 grid-rows-3 h-full w-full gap-1 p-1">
        {colors.map((color, i) => (
          <div
            key={i}
            className="rounded-sm border border-cyber-green/30"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );

  // Different colors for each face (Rubik's cube style)
  const faceColors = [
    // Front - Green
    Array(9).fill("rgba(0, 255, 136, 0.8)"),
    // Back - Darker green
    Array(9).fill("rgba(0, 255, 136, 0.6)"),
    // Right - Medium green
    Array(9).fill("rgba(0, 255, 136, 0.7)"),
    // Left - Medium green
    Array(9).fill("rgba(0, 255, 136, 0.7)"),
    // Top - Light green
    Array(9).fill("rgba(0, 255, 136, 0.9)"),
    // Bottom - Dark green
    Array(9).fill("rgba(0, 255, 136, 0.5)"),
  ];

  return (
    <div
      className="relative mx-auto"
      style={{
        width: `${cubeSize * 1.5}px`,
        height: `${cubeSize * 1.5}px`,
        perspective: "1000px",
      }}
    >
      <div
        ref={cubeRef}
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateX(-20deg) rotateY(20deg)",
        }}
      >
        <Face transform={`translateZ(${faceSize}px)`} colors={faceColors[0]} />
        <Face transform={`rotateY(180deg) translateZ(${faceSize}px)`} colors={faceColors[1]} />
        <Face transform={`rotateY(90deg) translateZ(${faceSize}px)`} colors={faceColors[2]} />
        <Face transform={`rotateY(-90deg) translateZ(${faceSize}px)`} colors={faceColors[3]} />
        <Face transform={`rotateX(90deg) translateZ(${faceSize}px)`} colors={faceColors[4]} />
        <Face transform={`rotateX(-90deg) translateZ(${faceSize}px)`} colors={faceColors[5]} />
      </div>
    </div>
  );
}

