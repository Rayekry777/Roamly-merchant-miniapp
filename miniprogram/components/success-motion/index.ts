import lottie from "lottie-miniprogram";
import successAnimation from "../../assets/lottie/success-data";

type AnimationInstance = { destroy(): void };
let activeAnimation: AnimationInstance | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

Component({
  properties: { message: { type: String, value: "操作成功" } },
  data: { visible: false, motionEnabled: true },
  lifetimes: {
    attached() {
      this.setData({
        motionEnabled: getApp<{ globalData: { motionEnabled: boolean } }>()
          .globalData.motionEnabled,
      });
    },
    detached() {
      this.clearMotion();
    },
  },
  methods: {
    show(duration = 1400) {
      if (hideTimer) clearTimeout(hideTimer);
      this.clearMotion();
      this.setData({ visible: true }, () => this.play());
      hideTimer = setTimeout(() => {
        this.clearMotion();
        this.setData({ visible: false });
      }, duration);
    },
    play() {
      if (!this.data.motionEnabled) return;
      this.createSelectorQuery()
        .select("#success-canvas")
        .fields({ node: true, size: true })
        .exec((result) => {
          const canvas = result[0]?.node as
            | WechatMiniprogram.Canvas
            | undefined;
          if (!canvas) {
            this.setData({ motionEnabled: false });
            return;
          }
          try {
            lottie.setup(canvas);
            activeAnimation = lottie.loadAnimation({
              renderer: "canvas",
              loop: false,
              autoplay: true,
              animationData: successAnimation,
              rendererSettings: { context: canvas.getContext("2d") },
            });
          } catch {
            this.clearMotion();
            this.setData({ motionEnabled: false });
          }
        });
    },
    clearMotion() {
      activeAnimation?.destroy();
      activeAnimation = undefined;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = undefined;
    },
    noop() {},
  },
});
