import Box from './Box';
import {BoxGeometry, Geometry, Mesh, MeshBasicMaterial, TextureLoader} from "three";
import {recreateCubeUV, LEFT, TOP, BEHIND, RIGHT} from '../util/MapUtil';
import box_top from '../res/box_top.png';
import box_middle from '../res/box_middle.png';
import box_bottom from '../res/box_bottom.png';
import TWEEN from '@tweenjs/tween.js';
import {animateFrame} from "../util/TweenUtil";

export default class MagicCubeBox extends Box {
  constructor(prev) {
    super(prev)
  }

  initBox() {
    const height = this.height / 3;
    const topMaterial = new MeshBasicMaterial({
      map: new TextureLoader().load(box_top),
    });
    const middleMaterial = new MeshBasicMaterial({
      map: new TextureLoader().load(box_middle),
    });
    const bottomMaterial = new MeshBasicMaterial({
      map: new TextureLoader().load(box_bottom),
    });

    const topGeometry = new BoxGeometry(this.height * 1.5, height, this.height * 1.5);
    const middleGeometry = new BoxGeometry(this.height * 1.5, height, this.height * 1.5);
    const bottomGeometry = new BoxGeometry(this.height * 1.5, height, this.height * 1.5);

    // 魔方上方网格
    recreateCubeUV(198, 198, topGeometry, LEFT, 0, 0, 148, 50);
    recreateCubeUV(198, 198, topGeometry, TOP, 0, 50, 148, 198);
    recreateCubeUV(198, 198, topGeometry, BEHIND, 148, 50, 198, 198, true);
    topGeometry.translate(0, height * 2.5, 0);
    const topMesh = new Mesh(topGeometry, topMaterial);

    for ( let j = 0; j <topMesh.geometry.faces.length; j++ ) {
      topMesh.geometry.faces[j].materialIndex = 0;
    }

    // 魔方中间网格
    recreateCubeUV(444, 50, middleGeometry, LEFT, 0, 0, 148, 50);
    recreateCubeUV(444, 50, middleGeometry, TOP, 0, 0, 1, 1);
    recreateCubeUV(444, 50, middleGeometry, BEHIND, 148, 50, 296, 0);
    recreateCubeUV(444, 50, middleGeometry, RIGHT, 296, 50, 444, 0);
    middleGeometry.translate(0, height * 1.5, 0);
    const middleMesh = new Mesh(middleGeometry, middleMaterial);

    for ( let j = 0; j <middleMesh.geometry.faces.length; j++ ) {
      middleMesh.geometry.faces[j].materialIndex = 1;
    }

    // 魔方下部网格
    recreateCubeUV(444, 50, bottomGeometry, LEFT, 0, 0, 148, 50);
    recreateCubeUV(444, 50, bottomGeometry, TOP, 0, 0, 1, 1);
    recreateCubeUV(444, 50, bottomGeometry, BEHIND, 148, 50, 296, 0);
    bottomGeometry.translate(0, height/2, 0);
    const bottomMesh = new Mesh(bottomGeometry, bottomMaterial);

    for ( let j = 0; j <bottomMesh.geometry.faces.length; j++ ) {
      bottomMesh.geometry.faces[j].materialIndex = 2;
    }

    // 合并网格
    const meshArr = [topMesh, bottomMesh];
    const totalGeometry = new Geometry();
    const totalMaterial = [];

    meshArr.forEach((mesh, index) => {
      for ( let j = 0; j <mesh.geometry.faces.length; j++ ) {
        mesh.geometry.faces[j].materialIndex = index;
      }
      mesh.updateMatrix();
      totalMaterial.push(mesh.material);
      totalGeometry.merge(mesh.geometry, mesh.matrix);
    });

    this.middleMesh = middleMesh;
    this.middleMesh.castShadow = true;
    this.mesh = new Mesh(totalGeometry, totalMaterial);
    this.mesh.add(middleMesh);
  }

  doAnimate() {
    let last = 0;
    new TWEEN.Tween({rotate: 0})
      .to({rotate: -Math.PI/2
      }, 300)
      .easing(TWEEN.Easing.Linear.None)
      .onUpdate(({rotate})=>{
        this.middleMesh.rotateY(rotate - last);
        last = rotate;
      })
      .delay(300)
      .start();

    animateFrame();
  }

}
