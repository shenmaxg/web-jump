import Box from './Box';
import {CylinderGeometry, Mesh, MeshLambertMaterial} from "three";

export default class CylinderBox extends Box {
  constructor(prev) {
    super(prev)
  }

  // 生成盒子
  initBox() {
    const geometry = new CylinderGeometry(this.size/2, this.size/2, this.height, 50);
    const material = new MeshLambertMaterial({color: this.color,});

    geometry.translate(0, this.height/2, 0);
    this.mesh = new Mesh(geometry, material);
  }
}
