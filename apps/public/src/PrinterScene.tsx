import { useEffect, useRef } from "react";
import * as THREE from "three";

export type PrinterState = "idle" | "working" | "success" | "error";

export function PrinterScene({
  progress,
  state,
}: {
  progress: number;
  state: PrinterState;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const stateRef = useRef(state);
  const drawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    progressRef.current = progress;
    stateRef.current = state;
    drawRef.current?.();
  }, [progress, state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const css = getComputedStyle(
      canvas.closest(".site") ?? document.documentElement,
    );
    const accent = css.getPropertyValue("--accent").trim() || "#d97b6e";
    const accent2 = css.getPropertyValue("--accent-2").trim() || "#60e1e0";
    const surface = css.getPropertyValue("--surface").trim() || "#241a19";
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(260, 190, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 260 / 190, 0.1, 100);
    camera.position.set(0, 1.1, 7.2);
    camera.lookAt(0, -0.05, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x20251f, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 3.4);
    key.position.set(4, 6, 5);
    key.castShadow = true;
    scene.add(key);
    const rim = new THREE.PointLight(new THREE.Color(accent2), 7, 8);
    rim.position.set(-3, 1.5, 3);
    scene.add(rim);

    const printer = new THREE.Group();
    printer.rotation.set(-0.12, -0.38, 0);
    scene.add(printer);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(surface),
      roughness: 0.38,
      metalness: 0.28,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x090c0a,
      roughness: 0.5,
      metalness: 0.35,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accent),
      emissive: new THREE.Color(accent),
      emissiveIntensity: 0.18,
      roughness: 0.3,
    });
    const addBox = (
      size: [number, number, number],
      position: [number, number, number],
      material: THREE.Material,
      rotationX = 0,
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.rotation.x = rotationX;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      printer.add(mesh);
      return mesh;
    };
    addBox([3.05, 1.35, 2.05], [0, 0.18, 0], bodyMaterial);
    addBox([2.65, 0.32, 1.72], [0, 1.02, -0.08], bodyMaterial, -0.06);
    addBox([2.2, 0.1, 0.15], [0, 0.38, 1.06], darkMaterial);
    addBox([2.42, 0.12, 1.48], [0, -0.88, 0.78], bodyMaterial, -0.18);
    addBox([1.7, 0.06, 1.05], [0, -0.75, 1.2], darkMaterial, -0.18);
    addBox([0.74, 0.22, 0.12], [0.82, 0.88, 0.88], darkMaterial, -0.06);

    const statusLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 20, 20),
      accentMaterial,
    );
    statusLight.position.set(0.94, 0.91, 0.99);
    printer.add(statusLight);

    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 512;
    textureCanvas.height = 640;
    const context = textureCanvas.getContext("2d")!;
    context.fillStyle = "#f5f3ed";
    context.fillRect(0, 0, 512, 640);
    context.fillStyle = accent;
    context.fillRect(40, 42, 118, 13);
    context.fillStyle = "#172019";
    context.font = "700 27px sans-serif";
    context.fillText("CURRICULUM VITAE", 40, 92);
    context.fillStyle = "#59615a";
    [142, 168, 194, 250, 276, 332, 358, 384, 440, 466, 492].forEach(
      (y, index) => context.fillRect(40, y, index % 3 === 1 ? 305 : 405, 6),
    );
    const paperTexture = new THREE.CanvasTexture(textureCanvas);
    paperTexture.colorSpace = THREE.SRGBColorSpace;
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(1.82, 2.28),
      new THREE.MeshStandardMaterial({
        map: paperTexture,
        roughness: 0.82,
        side: THREE.DoubleSide,
      }),
    );
    paper.position.set(0, 0.18, 1.13);
    paper.castShadow = true;
    printer.add(paper);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 4),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.32 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.24;
    ground.receiveShadow = true;
    scene.add(ground);

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const clock = new THREE.Clock();
    let animationFrame = 0;
    const render = () => {
      const target =
        stateRef.current === "working"
          ? progressRef.current / 100
          : stateRef.current === "success"
            ? 1
            : 0;
      paper.scale.y = 0.18 + target * 0.82;
      paper.position.y = 0.28 - target * 1.42;
      paper.position.z = 1.14 + target * 0.1;
      const working = stateRef.current === "working";
      accentMaterial.emissiveIntensity = working
        ? 0.45
        : stateRef.current === "error"
          ? 0.05
          : 0.18;
      if (!reducedMotion) {
        const elapsed = clock.getElapsedTime();
        printer.position.y = Math.sin(elapsed * 1.15) * 0.035;
        printer.rotation.y = -0.38 + Math.sin(elapsed * 0.62) * 0.035;
        statusLight.scale.setScalar(
          working ? 0.88 + Math.sin(elapsed * 8) * 0.18 : 1,
        );
      }
      renderer.render(scene, camera);
    };
    drawRef.current = render;
    const loop = () => {
      render();
      animationFrame = requestAnimationFrame(loop);
    };
    if (reducedMotion) render();
    else loop();

    return () => {
      cancelAnimationFrame(animationFrame);
      drawRef.current = null;
      paperTexture.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="printer-3d-canvas"
      width="520"
      height="380"
      aria-hidden="true"
    />
  );
}
