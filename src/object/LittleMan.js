import {
  SphereGeometry,
  CylinderGeometry,
  MeshLambertMaterial,
  Geometry,
  Group,
  Mesh,
} from 'three'
import TWEEN from '@tweenjs/tween.js';
import {
  LITTLE_MAN_WIDTH,
  LITTLE_MAN_HEIGHT,
  LITTLE_MAN_COLOR,
  JUMP_TIME,
  HIGH_JUMP,
  STORAGE_TIME,
  ENABLE_AUTO_JUMP
} from "../config/constant";
import {animateFrame} from '../util/TweenUtil';
import Box from './Box';
import Particle from './Particle';
import Tail from './Tail';

class LittleMan {

  constructor (stage, boxGroup) {
    this.stage = stage;
    this.boxGroup = boxGroup;
    // 定义小人的材质，方便复用
    this.materail = new MeshLambertMaterial({color: LITTLE_MAN_COLOR});
    // 头部
    this.head = null;
    // 躯干
    // 将这个分开的原因在于跳跃的时候躯干被压缩，而头部不会被压缩
    this.trunk = null;
    // 头部 + 躯干
    this.body = null;
    // 控制旋转的部分
    // 和 body 的区别在于坐标基点不同，也就导致旋转的中心不同
    this.bodyRotate = null;
    // 站在盒子上
    this.box = null;
    // 默认状态
    this.state = LittleMan.STATE.init;

    // 记录躯干的高度
    this.trunkHeight = 0;

    // 以下四个数据记录了蓄力压缩时的参数，用于回弹
    this.trunkScaleY = 1;
    this.headYPosition = LITTLE_MAN_HEIGHT;
    this.trunkScaleXZ = 1;
    this.boxScaleY = 1;

    // 残影
    this.tail = null;

    // 粒子
    this.particle = new Particle();

    this.init();
  }

  init () {
    // 创建头部
    this.initHead();
    // 创建躯干
    this.initTrunk();
    // 整体 = 头部 + 躯干
    this.initBody();
    // 初始化位置
    this.initPosition();
    // 初始化拖尾
    this.initTail();
    // 初始化事件监听
    this.initEventListener();
  }

  // 头部
  initHead() {
    // 球缓冲几何体
    const headGeometry = new SphereGeometry(LITTLE_MAN_WIDTH/2, 40, 40);

    this.head = new Mesh(headGeometry, this.materail);
    // 小人也能投射阴影
    this.head.castShadow = true;

    // 头部向上移动
    this.head.translateY(LITTLE_MAN_HEIGHT);
  }

  // 躯干
  initTrunk() {
    // 躯干的高度是总的高度减去头部的大小，和头部稍微离开一些
    const trunkHeight = LITTLE_MAN_HEIGHT - 1.3 * LITTLE_MAN_WIDTH;

    this.trunkHeight = trunkHeight;
    // 上方球体
    const trunkTopGeometry = new SphereGeometry(LITTLE_MAN_WIDTH/2, 40, 40);
    trunkTopGeometry.translate(0, trunkHeight, 0);

    // 中间圆柱，和上方球体相切
    const trunkCenterGeometry = new CylinderGeometry(
      LITTLE_MAN_WIDTH/2,
      LITTLE_MAN_WIDTH/2 * .8,
      trunkHeight/4,
      40
    );
    // 向上移动到和球体相切
    trunkCenterGeometry.translate(0, trunkHeight / 8 * 7, 0);

    // 下方圆柱
    const trunkBottomGeometry = new CylinderGeometry(
      LITTLE_MAN_WIDTH/2 * .8,
      LITTLE_MAN_WIDTH/2 * 1.3,
      trunkHeight/4 * 3,
      40
    );
    // 向上移动到和上方圆柱相切
    trunkBottomGeometry.translate(0, 3 /8 * trunkHeight, 0);

    // 三者合成躯干
    const trunkGeometry = new Geometry();
    trunkGeometry.merge(trunkTopGeometry);
    trunkGeometry.merge(trunkCenterGeometry);
    trunkGeometry.merge(trunkBottomGeometry);

    this.trunk = new Mesh(trunkGeometry, this.materail);
    this.trunk.castShadow = true;
    // 躯干能接收头部的阴影
    this.trunk.receiveShadow = true;
  }

  // 身体
  initBody() {
    // bodyRotate 将旋转中心点移动到物体的中间部分
    this.bodyRotate = new Group();
    this.bodyRotate.translateY(LITTLE_MAN_HEIGHT/2);
    this.bodyRotate.add(this.head);
    this.head.translateY(-LITTLE_MAN_HEIGHT/2);
    this.bodyRotate.add(this.trunk);
    this.trunk.translateY(-LITTLE_MAN_HEIGHT/2);

    // 注意，body 的 position 还是在坐标原点，也就是小人的脚下
    this.body = new Group();
    this.body.add(this.bodyRotate);
  }

  // 初始化小人的高度
  initPosition() {
    this.box = this.boxGroup.last.prev;

    // 向上移动盒子的高度
    this.body.translateY(this.box.height);
  }

  // 尾巴展示跳跃过程中的残影
  initTail() {
    this.tail = new Tail(this.stage.scene, this.bodyRotate);
  }

  initEventListener () {
    const container = this.stage.renderer.domElement;
    const isMobile = 'ontouchstart' in document;
    const mousedownName = isMobile ? 'touchstart' : 'mousedown';
    const mouseupName = isMobile ? 'touchend' : 'mouseup';

    // 监听按下事件
    container.addEventListener(mousedownName, (event) => {
      event.preventDefault();
      // 开始蓄力
      if(this.state === LittleMan.STATE.init) {
        this.state = LittleMan.STATE.storage;
        // 粒子聚集
        this.particle.gather(this.body);
        // 形变
        this.storage()
      }
    }, false);

    // 监听松开事件
    container.addEventListener(mouseupName, (event) => {
      event.preventDefault();

      if(this.state === LittleMan.STATE.storage) {
        this.state = LittleMan.STATE.jumping;
        // 停止粒子聚集
        this.particle.stopGather();

        // 跳跃
        this.jump();
      }
    }, false)
  }

  // 蓄力
  storage() {
    const tween = new TWEEN.Tween({
      headYPosition: LITTLE_MAN_HEIGHT/2,
      trunkScaleXZ: 1,
      trunkScaleY: 1,
      boxScaleY:1
    }).to({
        headYPosition: LITTLE_MAN_HEIGHT/2 - this.trunkHeight * 0.4,
        trunkScaleXZ: 1.3,
        trunkScaleY: 0.6,
        boxScaleY:0.6
    }, STORAGE_TIME)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({
        headYPosition,
        trunkScaleXZ,
        trunkScaleY,
        boxScaleY,
      })=>{
        if (this.state !== LittleMan.STATE.storage) {
          tween.stop();
        }
        // 记录下躯干的缩放程度，用于计算跳跃初始速度
        this.trunkScaleY = trunkScaleY;
        this.headYPosition = headYPosition;
        this.trunkScaleXZ = trunkScaleXZ;
        this.boxScaleY = boxScaleY;

        // 盒子缩放
        this.box.scaleY(boxScaleY);
        // 躯干缩放
        this.trunk.scale.set(trunkScaleXZ, trunkScaleY, trunkScaleXZ);
        // 身体下移
        this.body.position.setY(Box.defaultHeight * boxScaleY);
        // 头部下移
        this.head.position.setY(headYPosition);

        // 蓄力的时候记录位置，为拖尾做准备
        this.tail.markPosition();
      })
      .start();

    animateFrame();
  }

  // 执行跳跃动作
  jump() {
    // 在 X|Z 方向移动，匀速
    const jumpDistance = this.moveInXZ();
    // 计算跳跃的结果
    // 注意，此时跳跃还没有开始
    const state = this.calculateState(jumpDistance);

    // 回弹身体和盒子
    this.stretchBodyAndBox();
    // 前空翻
    this.flip();

    // 物体增加拖尾
    this.trailing();

    // Y 方向移动
    this.moveInY(this.afterJump.bind(this, state));
  }

  // 跳跃后
  afterJump(state) {
    // 跳到了本个盒子
    if (state === LittleMan.STATE.stay) {
      this.body.finalX = this.body.position.x;
      this.body.finalZ = this.body.position.z;

      // 更新状态
      this.state = LittleMan.STATE.init;

      // 粒子散开效果
      this.particle.scatter();
    }

    // 跳到了下个盒子
    if (state === LittleMan.STATE.nextBox) {
      // 创建一个新的盒子
      const last = this.boxGroup.createBox();
      this.box = last.prev;

      // 更新状态
      this.state = LittleMan.STATE.init;

      // 粒子散开效果
      this.particle.scatter();

      // 盒子执行动画
      this.box.doAnimate();

      // 移动位置
      // duration 的大小要小于小人的滞空时间
      this.boxGroup.updatePosition({duration: 300});
    }

    // 跳到了空地（游戏结束）
    if (state === LittleMan.STATE.outRange) {
      this.landToGround();
    }

    // 前向掉落,后向掉落（游戏结束）
    if (state === LittleMan.STATE.current_edge_front ||
        state === LittleMan.STATE.next_edge_front ||
        state === LittleMan.STATE.next_edge_back) {
      this.leaning(state);
    }
  }

  // X|Z 轴方向移动
  moveInXZ() {
    // X|Z 方向的初速度，与压缩程度成正比
    const k = Math.max(1 - this.trunkScaleY, 0.03);
    const vxz = k;

    // s=v*t
    // distance 是跳跃的距离
    let distance = vxz * JUMP_TIME;
    let tan, cos, sin;

    // 计算 tan
    if (this.box.direction === 'z') {
      tan = this.body.position.x/(this.box.next.position.z - this.body.position.z);
    } else {
      tan = this.body.position.z/(this.body.position.x - this.box.next.position.x);
    }

    // 通过 tan 计算 sin 和 cos
    sin = tan/Math.sqrt(1 + tan*tan);
    cos = Math.sqrt(1 - sin*sin);

    if (ENABLE_AUTO_JUMP) {
      // 测试用，每次都跳到中央
      distance = this.box.distance + this.box.size/2 + this.box.next.size/2;
    }

    // 定义目的地坐标
    let targetZ = 0;
    let targetX = 0;

    // 使用 finalX 和 finalZ 是由于场景移动的影响，x 和 z 可能不准确
    const {finalX:x, finalZ:z} = this.body;

    if (this.box.direction === 'z') {
      targetZ = z - distance * cos;
      targetX = x + distance * sin;
    } else {
      targetZ = z + distance * sin;
      targetX = x + distance * cos;
    }

    // 匀速运动
    new TWEEN.Tween({x:this.body.position.x, z:this.body.position.z})
      .to({x:targetX, z:targetZ
      }, JUMP_TIME)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({x, z})=>{
        this.body.position.setX(x);
        this.body.position.setZ(z);
      })
      .start();

    animateFrame();

    // 返回X|Z距离，后续用于判断跳跃的结果
    return Math.abs(distance * cos);
  }

  moveInY(cb) {
    const {y} = this.body.position;

    // y 方向向上的时间
    const upTime = JUMP_TIME * 0.5;
    // y 方向向下的时间
    const downTime = JUMP_TIME - upTime;

    // 跳跃达到的高度
    const height = Box.defaultHeight + HIGH_JUMP;

    // 上升阶段，Quartic 表示平方
    const up = new TWEEN.Tween({y})
      .to({y: height}, upTime)
      .easing(TWEEN.Easing.Quartic.Out)
      .onUpdate(({y})=>{
        this.body.position.setY(y);
      });

    // 下降阶段
    const down = new TWEEN.Tween({y: height})
      .to({y: Box.defaultHeight}, downTime)
      .easing(TWEEN.Easing.Quartic.In)
      .onComplete(() => {
        // 执行回调
        cb && cb();
      })
      .onUpdate(({y})=>{
        this.body.position.setY(y);
      });

    // 上升 -> 下降
    up.chain(down).start();

    animateFrame();
  }

  // 前空翻
  flip() {
    const {direction} = this.box;

    let lastAngle = 0;

    // 根据时间旋转不同的角度
    new TWEEN.Tween({t: 0})
      .to({t: JUMP_TIME }, JUMP_TIME)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({t})=>{
        // 更新位置
        const angle = 2 * Math.PI * t / JUMP_TIME;

        if (direction === 'x') {
          this.bodyRotate.rotateZ(lastAngle - angle);
        } else {
          this.bodyRotate.rotateX(lastAngle - angle);
        }

        lastAngle = angle;
      }).start();

    animateFrame();
  }

  // 拖尾
  trailing() {
    let lastTime = 0;

    new TWEEN.Tween({t: 0})
      .to({t: JUMP_TIME }, JUMP_TIME)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({t})=>{
        // 更新位置
        this.tail.showTail(t - lastTime);
        lastTime = t;
      })
      .onComplete(() => {
        this.tail.reset();
      })
      .start();

    animateFrame();
  }

  // 回弹身体和盒子
  stretchBodyAndBox() {
    new TWEEN.Tween({
      headYPosition: this.headYPosition,
      trunkScaleXZ: this.trunkScaleXZ,
      trunkScaleY: this.trunkScaleY,
      boxScaleY:this.boxScaleY
    }).to({
      headYPosition: LITTLE_MAN_HEIGHT/2,
      trunkScaleXZ: 1,
      trunkScaleY: 1,
      boxScaleY:1
    }, JUMP_TIME/3)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({
                   headYPosition,
                   trunkScaleXZ,
                   trunkScaleY,
                   boxScaleY,
                 })=>{
        this.box.scaleY(boxScaleY);
        this.trunk.scale.set(trunkScaleXZ, trunkScaleY, trunkScaleXZ);
        // 回弹的时候不要设置 body 的 Y 的值，这个值会在跳跃过程中变化
        // this.body.position.setY(Box.defaultHeight * boxScaleY);
        this.head.position.setY(headYPosition);
      })
      .start();

    animateFrame();
  }

  // 计算跳跃后的状态
  calculateState(jumpDistance) {
    const {direction, size, next, position, distance} = this.box;
    const {size: nextSize} = next;
    const {x, z} = this.body.position;

    // 当前盒子的边缘距离
    let currentEdge;

    if (direction === 'x') {
      currentEdge  = position.x + size/2 - x;
    } else {
      currentEdge  = z - position.z + size/2;
    }

    // 下一个盒子近点和远点距离
    const nextNearEdge = currentEdge + distance;
    const nextFarEdge = nextNearEdge + nextSize;

    // 没有跳出当前盒子的范围
    if (jumpDistance < currentEdge) {
      return LittleMan.STATE.stay;
    }

    // 边缘位置，前向掉落
    if (jumpDistance < currentEdge + LITTLE_MAN_WIDTH/2) {
      return LittleMan.STATE.current_edge_front;
    }

    // 两个盒子之间
    if (jumpDistance < nextNearEdge - LITTLE_MAN_WIDTH/2) {
      return LittleMan.STATE.outRange;
    }

    // 边缘位置，后向掉落
    if (jumpDistance < nextNearEdge) {
      return LittleMan.STATE.next_edge_back;
    }

    // 下一个盒子上
    if (jumpDistance < nextFarEdge) {
      return LittleMan.STATE.nextBox;
    }

    // 边缘位置，前向掉落
    if (jumpDistance < nextFarEdge + LITTLE_MAN_WIDTH/2) {
      return LittleMan.STATE.next_edge_front;
    }

    // 超出了下一个盒子
    return LittleMan.STATE.outRange;
  }

  // 平稳降落到地面
  landToGround() {
    new TWEEN.Tween({
      y: Box.defaultHeight,
    }).to({
      y: 0
    }, JUMP_TIME * 2)
      .easing(TWEEN.Easing.Quintic.Out)
      .onUpdate(({ y })=>{
        this.body.position.setY(y);
      })
      .start();

    animateFrame();
  }

  // 倾倒动画
  leaning(state) {
    const {direction, position:currentPosition, distance, size:currentSize} = this.box;
    const {position:nextPosition, size:nextSize} = this.box.next;
    // 计算倾倒物体和下一个物体之间的距离，判断是否发生碰撞
    let distanceBetweenBox = distance;

    // 如果是下一个物体前向倾倒，永远不会发生碰撞
    if (state === LittleMan.STATE.next_edge_front) {
      distanceBetweenBox = LITTLE_MAN_HEIGHT * 2;
    }

    // 以 position 为圆心，前向旋转，时间为 JUMP_TIME * 2
    const rotateTime = JUMP_TIME * 2;
    let lastAngle = 0;

    const rotate = new TWEEN.Tween({t: 0})
      .to({t: rotateTime }, rotateTime)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({t})=>{
        // 更新位置
        const angle = Math.PI / 2 * t / rotateTime;
        // 计算在该角度下小人占据的长度
        const distance = Math.sin(angle) * LITTLE_MAN_HEIGHT + LITTLE_MAN_WIDTH;

        // 发生碰撞
        if (distance > distanceBetweenBox) {
          rotate.stop();
        }

        // 根据当前前进方向和倾倒的位置，判断小人旋转的方向
        if (direction === 'x') {
          if (state === LittleMan.STATE.next_edge_front ||
              state === LittleMan.STATE.current_edge_front) {
            this.body.rotateZ(lastAngle - angle);
          } else {
            this.body.rotateZ(angle - lastAngle);
          }
        } else {

          if (state === LittleMan.STATE.next_edge_front ||
            state === LittleMan.STATE.current_edge_front) {
            this.body.rotateX(lastAngle - angle);
          } else {
            this.body.rotateX(angle - lastAngle);
          }
        }

        lastAngle = angle;
      }).start();


    let slideXZ = null;
    // 向外滑出一定的距离
    const slideTime = JUMP_TIME/2;

    if (direction === 'x') {
      let xTarget;
      if (state === LittleMan.STATE.current_edge_front) {
        xTarget = currentPosition.x + currentSize/2 + LITTLE_MAN_WIDTH/2 + 0.2;
      } else if (state === LittleMan.STATE.next_edge_back) {
        xTarget = nextPosition.x - nextSize/2 - LITTLE_MAN_WIDTH/2 - 0.2;
      } else if (state === LittleMan.STATE.next_edge_front) {
        xTarget = nextPosition.x + nextSize/2 + LITTLE_MAN_WIDTH/2 + 0.2;
      }

      slideXZ = new TWEEN.Tween({x: this.body.position.x,})
        .to({x: xTarget}, slideTime)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(({x})=>{
          this.body.position.setX(x);
        })
    } else {
      let zTarget;
      if (state === LittleMan.STATE.current_edge_front) {
        zTarget = currentPosition.z - currentSize/2 - LITTLE_MAN_WIDTH/2 - 0.2;
      } else if (state === LittleMan.STATE.next_edge_back) {
        zTarget = nextPosition.z + nextSize/2 + LITTLE_MAN_WIDTH/2 + 0.2;
      } else if (state === LittleMan.STATE.next_edge_front) {
        zTarget = nextPosition.z - nextSize/2 - LITTLE_MAN_WIDTH/2 - 0.2;
      }

      slideXZ = new TWEEN.Tween({z: this.body.position.z})
        .to({z: zTarget,}, slideTime)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(({z})=>{
          this.body.position.setZ(z);
        })
    }

    // 滑动之后，整体下落
    const fallTime = rotateTime - slideTime;
    const fallDown = new TWEEN.Tween({y: this.body.position.y})
      .to({y: LITTLE_MAN_WIDTH/2,}, fallTime)
      .easing(TWEEN.Easing.Quintic.Out)
      .onUpdate(({y})=>{
        this.body.position.setY(y);
      });

    slideXZ.chain(fallDown).start();

    animateFrame();
  }

  // 更新位置
  updatePosition(position) {
    const {x, y, z} = position;

    this.body.position.set(x, y, z);
  }

  // 加入舞台
  enterStage(stage) {
    stage.scene.add(this.body);
  }

}

LittleMan.STATE = {
  // 初始
  init: 1,
  // 蓄力
  storage: 1<<1,
  // 跳跃
  jumping: 1<<2,
  // 当前盒子
  stay: 1<<3,
  // 下个盒子
  nextBox: 1<<4,
  // 出界
  outRange: 1<<5,
  // 当前盒子边缘前向掉落
  current_edge_front: 1<<6,
  // 下一个盒子边缘后向掉落
  next_edge_back: 1<<7,
  // 下一个盒子边缘前向掉落
  next_edge_front: 1<<8
};

export default LittleMan;
