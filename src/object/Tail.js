import {
  MeshBasicMaterial,
  Mesh,
  DoubleSide,
  PlaneGeometry,
  Vector3
} from 'three'

import {
  TAIL_WIDTH,
  TAIL_HEIGHT,
  TAIL_DURATION,
  WIDTH
} from "../config/constant";

// 一个完整的拖尾是由若干个碎片组成的
class TailFragment{
  constructor(geometry, material) {
    this.tickTime = 0;
    this.mesh = new Mesh(geometry, material);
    this.mesh.visible = false;
  }

  update(lastPosition, nowPosition, scale) {
    // 摆放位置
    this.mesh.position.set(nowPosition.x, nowPosition.y, nowPosition.z);
    // y 方向缩放
    this.mesh.scale.y = scale;

    // 修正方向
    this.mesh.lookAt(lastPosition);
    // 向上 45 度，也是我们观察的角度
    this.mesh.rotateY(Math.PI / 2);

    // 变可见
    this.mesh.visible = true;
  }

  reset(){
    this.tickTime = 0;
    this.mesh.scale.set(1, 1, 1);
    this.mesh.visible = false;
  }
}

export default class Tail {
  constructor(scene, body) {
    this.scene = scene;
    this.body = body;

    // 缓存的可以使用的拖尾碎片
    this.cachedTailFragment = [];

    // 正在使用的拖尾碎片
    this.usedTailFragment = [];

    // 记录小人所在的当前位置和上个位置
    this.lastPosition = null;
    this.nowPosition = null;

    this.init();
  }

  // 缓存若干 TailFragment
  init(){
    this.geometry = new PlaneGeometry(TAIL_WIDTH, TAIL_HEIGHT);

    // 白色带透明度
    this.material = new MeshBasicMaterial({
      color: 0xffffff,
      side: DoubleSide,
      transparent: true,
      opacity: 0.6
    });

    // 我们设置的屏宽是 100，精度是 1
    // 粗略的计算跳跃半屏需要 50
    for (let i = 0; i < 50; i++) {
      const cellTail = new TailFragment(this.geometry, this.material);

      this.scene.add(cellTail.mesh);
      this.cachedTailFragment.push(cellTail);
    }
  }

  // 蓄力的时候记录小人位置
  markPosition() {
    this.nowPosition = new Vector3();
    this.lastPosition = new Vector3();

    this.body.getWorldPosition(this.nowPosition);
    this.body.getWorldPosition(this.lastPosition);
  }

  // 跳跃的时候更新 Tail 位置
  showTail(tickTime) {
    // 正在使用的拖尾需要收缩，或者隐藏
    this.updateUsingFragment(tickTime);

    // 记录小人当前位置
    // this.nowPosition = this.body.position.clone();
    this.body.getWorldPosition(this.nowPosition);

    // 计算当前位置和上一个位置之间的距离
    const distance = this.nowPosition.distanceTo(this.lastPosition);

    // 两次渲染间的距离不能过大，过大说明设备卡顿
    // 也会导致拖尾很长，创建太多的 Fragment 对象
    if (distance < WIDTH/2) {
      // 距离超过了单个 Fragment 的宽度，此时需要生成 Fragment
      if (distance >= TAIL_WIDTH) {

        // 判断需要生成 Fragment 的个数
        const m = distance / TAIL_WIDTH;
        const n = Math.floor(m);

        // 时间间隔/显示时间
        const tickScale = tickTime / TAIL_DURATION;

        let lastPosition = this.lastPosition.clone();
        let nowPosition = this.nowPosition.clone();

        for (let i = 1; i <= n; i++) {
          // 多个 Fragment 位置简单的用插值法就可以了
          nowPosition = this.lastPosition.lerp(this.nowPosition, i/m);

          // 计算 Fragment 缩放比例
          let scale = 1 - tickScale + tickScale * (i / m) ;

          scale = scale <= 0 ? 0 : scale;

          const fragment = this.getFragment();
          // 更新位置与大小
          fragment.update(lastPosition, nowPosition, scale);

          lastPosition = nowPosition;
          if (i === n) {
            this.lastPosition = nowPosition;
          }
        }
      }
    } else {
      this.lastPosition = this.nowPosition;
    }
  }

  // 落地后，残影消失
  reset() {
    this.usedTailFragment.forEach((tailFragment) => {
      tailFragment.reset();
      this.cachedTailFragment.push(tailFragment);
    });

    this.usedTailFragment = [];
  }

  // 获得一个拖尾碎片，有的话从缓存拿，没有的话生成新的
  getFragment() {
    let fragment = this.cachedTailFragment.shift();
    if (!fragment) {
      fragment = new TailFragment(this.geometry, this.material);
      this.scene.add(fragment.mesh);
    }
    this.usedTailFragment.push(fragment);

    return fragment;
  }

  updateUsingFragment(tickTime) {
    // 当前正在使用的拖尾
    const fragmentList = this.usedTailFragment;
    // 该比例表示缩放速率，要在 TAIL_DURATION 内缩到0，也就是消失
    const deltaScaleY = 1 / TAIL_DURATION;

    for (let i = 0; i < fragmentList.length; i++) {
      // 更新时间
      fragmentList[i].tickTime += tickTime;

      // 压缩所有 Fragment 的高度
      const newScale = fragmentList[i].mesh.scale.y - deltaScaleY * tickTime;

      if (newScale > 0) {
        fragmentList[i].mesh.scale.y = newScale > 0 ? newScale : 0;

        // 判断透明度和高度，剔除用完的
        if (fragmentList[i].tickTime >= TAIL_DURATION) {
          fragmentList[i].reset();
          const fragment = fragmentList.shift();

          this.cachedTailFragment.push(fragment);
          // 此时 fragmentList 数量减少，索引 -1
          i--;
        }
      } else {
        fragmentList[i].reset();
        const fragment = fragmentList.shift();

        this.cachedTailFragment.push(fragment);
        i--;
      }
    }
  }
}
