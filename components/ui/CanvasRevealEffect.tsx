import { cn } from "@/lib/utils";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export const CanvasRevealEffect = ({
  animationSpeed = 0.4,
  opacities = [0.3, 0.3, 0.3, 0.5, 0.5, 0.5, 0.8, 0.8, 0.8, 1],
  colors = [[0, 255, 255]],
  containerClassName,
  dotSize,
  showGradient = true,
}: {
  animationSpeed?: number;
  opacities?: number[];
  colors?: number[][];
  containerClassName?: string;
  dotSize?: number;
  showGradient?: boolean;
}) => (
  <div className={cn("relative bg-white w-full h-full", containerClassName)}>
    <Canvas>
      <DotMatrix
        colors={colors}
        dotSize={dotSize ?? 3}
        opacities={opacities}
        animationSpeed={animationSpeed}
        center={["x", "y"]}
      />
    </Canvas>
    {showGradient && (
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-[84%]" />
    )}
  </div>
);

interface DotMatrixProps {
  colors?: number[][];
  opacities?: number[];
  dotSize?: number;
  animationSpeed?: number;
  center?: ("x" | "y")[];
}

const DotMatrix: React.FC<DotMatrixProps> = ({
  colors = [[0, 0, 0]],
  opacities = [0.04, 0.08, 0.14],
  dotSize = 2,
  animationSpeed = 0.4,
  center = ["x", "y"],
}) => {
  const uniforms = useMemo(() => {
    const mappedColors = colors.map((color) =>
      color.map((value) => value / 255)
    );
    return {
      u_colors: { value: mappedColors, type: "uniform3fv" },
      u_opacities: { value: opacities, type: "uniform1fv" },
      u_dot_size: { value: dotSize, type: "uniform1f" },
      u_animation_speed: { value: animationSpeed, type: "uniform1f" },
    };
  }, [colors, opacities, dotSize, animationSpeed]);

  return (
    <Shader
      source={`
        precision mediump float;
        in vec2 fragCoord;

        uniform float u_time;
        uniform float u_animation_speed;
        uniform float u_opacities[10];
        uniform vec3 u_colors[6];
        uniform float u_dot_size;
        uniform vec2 u_resolution;

        out vec4 fragColor;
        float random(vec2 xy) { return fract(sin(dot(xy ,vec2(12.9898,78.233))) * 43758.5453); }

        void main() {
          vec2 st = fragCoord.xy / u_resolution;
          vec2 gridPos = floor(st * u_dot_size);
          float opacity = u_opacities[int(random(gridPos) * 10.0)];
          vec3 color = u_colors[int(random(gridPos) * 6.0)];
          opacity *= step(random(gridPos + u_time * u_animation_speed), 0.5);
          fragColor = vec4(color, opacity);
        }
      `}
      uniforms={uniforms}
    />
  );
};

interface ShaderProps {
  source: string;
  uniforms: {
    [key: string]: {
      value: number | number[] | number[][] | THREE.Vector2;
      type: string;
    };
  };
}

const Shader: React.FC<ShaderProps> = ({ source, uniforms }) => {
  const { size } = useThree();
  const ref = useRef<THREE.Mesh | null>(null); // Explicitly typing the ref

  const material = useMemo(() => {
    const shaderUniforms = {
      u_time: { value: 0 },
      u_resolution: {
        value: new THREE.Vector2(size.width * 2, size.height * 2),
      },
      ...uniforms,
    };

    return new THREE.ShaderMaterial({
      vertexShader: `
        precision mediump float;
        in vec2 coordinates;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main() {
          vec2 pos = position.xy * 0.5 + 0.5;
          gl_Position = vec4(pos, 0.0, 1.0);
          fragCoord = pos * u_resolution;
        }
      `,
      fragmentShader: source,
      uniforms: shaderUniforms,
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
  }, [source, uniforms, size]);

  useFrame(({ clock }) => {
    if (ref.current) {
      const shaderMaterial = ref.current.material as THREE.ShaderMaterial; // Explicitly cast the material
      shaderMaterial.uniforms.u_time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={ref}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};
