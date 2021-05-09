import Box from './Box';
import {BoxBufferGeometry, Mesh, MeshLambertMaterial} from "three/src/Three";

export default class CubeBox extends Box {
  constructor(prev) {
    super(prev)
  }

  // 生成盒子
  initBox() {
    const geometry = new BoxBufferGeometry(this.size, this.height, this.size);
    const material = new MeshLambertMaterial({color: this.color,});

    geometry.translate(0, this.height/2, 0);
    this.mesh = new Mesh(geometry, material);
  }
}
