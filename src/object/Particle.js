import {
  MeshBasicMaterial,
  Mesh,
  PlaneGeometry,
  TextureLoader
} from 'three'

import {
  PARTICLE_NUM,
  PARTICLE_MIN_DISTANCE,
  PARTICLE_MAX_DISTANCE,
  LITTLE_MAN_WIDTH,
} from "../config/constant";

import TWEEN from '@tweenjs/tween.js';

import Dot from '../res/dot.png';
import {animateFrame} from "../util/TweenUtil";

export default class Particle {
  constructor() {
    // 粒子
    this.particles = [];

    // 预先生成粒子
    this.createParticles();
  }

  // 生成粒子
  createParticles(){
    // 白色材料
    const whiteParticleMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      map: new TextureLoader().load(Dot),
      alphaTest: 0.3
    });

    // 绿色材料
    const greenParticleMaterial = new MeshBasicMaterial({
      color: 0x52c41a,
      map: new TextureLoader().load(Dot),
      alphaTest: 0.3
    });
    // 粒子的大小为 2 * 2
    const particleGeometry = new PlaneGeometry(2, 2);

    // 生成白色粒子
    for (let i = 0; i < PARTICLE_NUM/2; ++i) {
      const particle = new Mesh(particleGeometry, whiteParticleMaterial);
      this.particles.push(particle);
    }

    // 生成绿色粒子
    for (let i = 0; i < PARTICLE_NUM/2; ++i) {
      const particle = new Mesh(particleGeometry, greenParticleMaterial);
      this.particles.push(particle);
    }

    // 调整粒子的朝向,和相机的一致
    for (let i = 0; i < PARTICLE_NUM; ++i) {
      this.particles[i].rotation.y = -Math.PI / 4;
      this.particles[i].rotation.x = -Math.PI / 4;
      this.particles[i].rotation.z = -Math.PI / 4;
    }
  }

  // 聚集
  gather(target) {
    for (let i = 0; i < PARTICLE_NUM; i++) {
      this.particles[i].gathering = true;
      this.particles[i].scattering = false;
      target.add(this.particles[i]);
      this.gatherParticles(this.particles[i]);
    }
  }

  // 每个粒子循环出现
  gatherParticles(particle) {
    const minDistance = PARTICLE_MIN_DISTANCE;
    const maxDistance = PARTICLE_MAX_DISTANCE;

    // 初始状态
    particle.scale.set(1, 1, 1);
    particle.visible = false;

    // 聚集停止
    if (!particle.gathering) return;

    // 位置随机
    const x = Math.random() > 0.5 ? 1 : -1;
    const z = Math.random() > 0.5 ? 1 : -1;
    particle.position.x = (minDistance + Math.random()*(maxDistance - minDistance))*x;
    particle.position.y = minDistance + Math.random()*(maxDistance - minDistance);
    particle.position.z = (minDistance + Math.random()*(maxDistance - minDistance))*z;

    // 动画时间 0.5 - 0.9
    const duration = 500 + Math.random() * 400;

    // 粒子缩放
    // 粒子向中心移动
    let gather = new TWEEN.Tween({
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      x: particle.position.x,
      y: particle.position.y,
      z: particle.position.z
    })
      .to({
        scaleX: 0.8 + Math.random(),
        scaleY: 0.8 + Math.random(),
        scaleZ: 0.8 + Math.random(),
        x: 0,
        y: 0,
        z: 0
      }, duration)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({scaleX, scaleY, scaleZ, x, y, z})=>{
        particle.scale.x = scaleX;
        particle.scale.y = scaleY;
        particle.scale.z = scaleZ;
        particle.position.setX(x);
        particle.position.setY(y);
        particle.position.setZ(z);
      })
      .onComplete(() => {
        this.gatherParticles(particle);
      })
      .onStart(() => {
        if (particle.gathering) {
          particle.visible = true;
        } else {
          gather.stop();
        }
      })
      .delay(Math.random() * 1000)
      .start();

    animateFrame();
  }

  // 停止粒子聚集效果
  stopGather() {
    for (let i = 0; i < PARTICLE_NUM; ++i) {
      this.particles[i].visible = false;
      this.particles[i].gathering = false;
    }
  }

  // 粒子散开效果
  scatter() {
    for (let i = 0; i < PARTICLE_NUM/2; ++i) {
      this.particles[i].scattering = true;
      this.particles[i].gathering = false;
      this.scatterParticles(this.particles[i]);
    }
  }

  scatterParticles(particle) {
    // 分散的时候距离比聚集的时候近
    const minDistance = LITTLE_MAN_WIDTH/2;
    const maxDistance = PARTICLE_MAX_DISTANCE/2;

    // 向上随机位置
    const x = (minDistance + Math.random() * (maxDistance - minDistance)) * (1 - 2 * Math.random());
    const z = (minDistance + Math.random() * (maxDistance - minDistance)) * (1 - 2 * Math.random());
    particle.scale.set(1, 1, 1);
    particle.visible = false;
    particle.position.x = x;
    particle.position.y = -0.5;
    particle.position.z = z;

    if (!particle.scattering) return;

    // 随机散开时间
    const duration = 300 + Math.random() * 200;

    // 随时间变小
    // 散开效果
    new TWEEN.Tween({
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      x: particle.position.x,
      y: particle.position.y,
      z: particle.position.z
    })
      .to({
        scaleX: 0.2,
        scaleY: 0.2,
        scaleZ: 0.2,
        x: 2 * particle.position.x,
        y: 2 * Math.random()* maxDistance,
        z: 2 * particle.position.z
      }, duration)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({scaleX, scaleY, scaleZ, x, y, z})=>{
        particle.scale.x = scaleX;
        particle.scale.y = scaleY;
        particle.scale.z = scaleZ;
        particle.position.setX(x);
        particle.position.setY(y);
        particle.position.setZ(z);
      })
      .onStart(() => {
        particle.visible = true;
      })
      .onComplete(() => {
        particle.scattering = false;
        particle.visible = false;
      })
      .start();

    animateFrame();
  }
}
