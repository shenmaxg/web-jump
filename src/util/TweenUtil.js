import TWEEN from '@tweenjs/tween.js'

// 每次动画 update 都要做的事情
// 本例中绑定了 render 函数
let frameAction = () => {};

const animateFrame = function () {
  if (animateFrame.running) {
    return
  }
  animateFrame.running = true;

  const animate = () => {
    const id = requestAnimationFrame(animate);
    const success = TWEEN.update();

    if (success) {
      frameAction && frameAction();
    } else {
      animateFrame.running = false;
      cancelAnimationFrame(id);
    }
  };
  animate()
};

const setFrameAction = (cb) => {
  frameAction = cb;
};

export{
  animateFrame,
  setFrameAction
}
