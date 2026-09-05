declare module "lottie-miniprogram" {
  const lottie: {
    setup(canvas: unknown): void;
    loadAnimation(options: Record<string, unknown>): {
      destroy(): void;
      play(): void;
    };
  };
  export default lottie;
}
