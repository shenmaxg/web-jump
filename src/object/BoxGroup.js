import {
  Group
} from 'three';
import TWEEN from '@tweenjs/tween.js';
import CubeBox from './CubeBox';
import CylinderBox from './CylinderBox';
import ExpressBox from './ExpressBox';
import MagicCubeBox from './MagicCubeBox';
import {animateFrame} from '../util/TweenUtil';
import {FAR, ENABLE_DISPOSE_BOX} from "../config/constant";

const BoxList = [{
  index: 0,
  box: CubeBox,
  isStatic: false
}, {
  index: 1,
  box: CylinderBox,
  isStatic: false
},{
  index: 2,
  box: ExpressBox,
  isStatic: true
},{
  index: 3,
  box: MagicCubeBox,
  isStatic: true
}];

export default class BoxGroup {

  constructor() {
    // 最后一个盒子
    this.last = null;
    // 存放盒子组
    this.group = new Group();
    // 保存一个小人的引用
    this.littleMan = null;
    // 存放盒子的缓存
    this.boxInstance = {};

    this.boxInstance[2] = new ExpressBox(null).mesh;
    this.boxInstance[3] = new MagicCubeBox(null).mesh;
  }

  getBoxInstance(index) {
    const boxObject = BoxList[index];

    if (boxObject.isStatic) {
      if (this.boxInstance[index]) {
        return new boxObject.box(this.last, this.boxInstance[index]);
      } else {
        const box = new boxObject.box(this.last);

        this.boxInstance[index] = box.mesh.clone();

        return box;
      }
    } else {
      return new boxObject.box(this.last);
    }
  }

  // 创建一个盒子
  createBox() {
    let box;

    if (!this.last || !this.last.prev) {
      box = new CubeBox(this.last);
    } else {
      const index = Math.ceil(Math.random() * BoxList.length - 1);

      box = this.getBoxInstance(index);
    }

    this.group.add(box.mesh);
    this.last = box;

    return this.last;
  }

  // 更新位置
  updatePosition({
    duration,
  }) {
    // 找到最后两个盒子的中点
    const last = this.last;
    const secondOfLast = last.prev;
    const centerX = 0.5 * (last.position.x + secondOfLast.position.x);
    const centerZ = 0.5 * (last.position.z + secondOfLast.position.z);

    let lastX = 0;
    let lastZ = 0;

    // 先记录下小人最终的目的地，因为可能在盒子未移动完成之前，小人点击了跳跃
    if (this.littleMan) {
      const {x, z} = this.littleMan.body.position;
      this.littleMan.body.finalX = x - centerX;
      this.littleMan.body.finalZ = z - centerZ;
    }

    // 配置动画参数并开始
    new TWEEN.Tween({x: 0,z: 0})
      .to({x: centerX, z: centerZ }, duration)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(({x,z})=>{
        const deltaX = x - lastX;
        const deltaZ = z - lastZ;

        // 更新盒子
        this.updateBoxPositionInChain(deltaX, deltaZ);
        // 更新小人
        this.updateLittleMan(deltaX, deltaZ);

        lastX = x;
        lastZ = z;
      })
      .start();

    animateFrame();
  }

  // 根据入参改变链路上的所有 Box 的位置
  updateBoxPositionInChain(deltaX, deltaZ) {
    let tail = this.last;
    const boxToDisPose = [];

    while(tail) {
      const {x, z} = tail.position;
      const position = {
        x: x - deltaX,
        z: z - deltaZ
      };

      if (ENABLE_DISPOSE_BOX) {
        if (position.x > 2 * FAR || position.z > 2 * FAR) {
          boxToDisPose.push(tail);
        } else {
          tail.updateXZPosition(position);
        }
      } else {
        tail.updateXZPosition(position);
      }

      tail = tail.prev;
    }

    if (ENABLE_DISPOSE_BOX) {
      boxToDisPose.forEach((box) => {
        if (box.next) {
          box.next.prev = null;
        }
        box.prev = null;
        box.next = null;
        box.mesh.geometry.dispose();
        box.mesh.material.dispose();
        box.mesh.dispose();
        box = null;
      });

      boxToDisPose.length = 0;
    }
  }

  updateLittleMan(deltaX, deltaZ) {
    if (this.littleMan) {
      this.littleMan.body.translateX(-deltaX);
      this.littleMan.body.translateZ(-deltaZ);
    }
  }

  // 加入场景
  enterStage(stage) {
    stage.scene.add(this.group);
  }

  setLittleMan(littleMan) {
    this.littleMan = littleMan;
  }

}
