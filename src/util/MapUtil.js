import * as THREE from 'three';

const RIGHT = 0;
const LEFT = 1;
const TOP = 2;
const BOTTOM = 3;
const BEHIND = 4;
const AFTER = 5;
function recreateCubeUV(textureWidth, textureHeight, geometry, faceIndex, x1, y1, x2, y2, rotate) {
  // 将 px 坐标转换到 uv 坐标
  const tileUvW = 1 / textureWidth;
  const tileUvH = 1 / textureHeight;
  let UVs = geometry.faceVertexUvs[0][faceIndex * 2];
  if (rotate) {
    UVs[0].x = x1 * tileUvW;
    UVs[0].y = y1 * tileUvH;
    UVs[2].x = x1 * tileUvW;
    UVs[2].y = y2 * tileUvH;
    UVs[1].x = x2 * tileUvW;
    UVs[1].y = y1 * tileUvH;
  } else {
    UVs[0].x = x1 * tileUvW;
    UVs[0].y = y1 * tileUvH;
    UVs[1].x = x1 * tileUvW;
    UVs[1].y = y2 * tileUvH;
    UVs[2].x = x2 * tileUvW;
    UVs[2].y = y1 * tileUvH;
  }
  UVs = geometry.faceVertexUvs[0][faceIndex * 2 + 1];
  if (rotate) {
    UVs[2].x = x1 * tileUvW;
    UVs[2].y = y2 * tileUvH;
    UVs[1].x = x2 * tileUvW;
    UVs[1].y = y2 * tileUvH;
    UVs[0].x = x2 * tileUvW;
    UVs[0].y = y1 * tileUvH;
  } else {
    UVs[0].x = x1 * tileUvW;
    UVs[0].y = y2 * tileUvH;
    UVs[1].x = x2 * tileUvW;
    UVs[1].y = y2 * tileUvH;
    UVs[2].x = x2 * tileUvW;
    UVs[2].y = y1 * tileUvH;
  }
}

export {
  recreateCubeUV,
  RIGHT,
  LEFT,
  TOP,
  BOTTOM,
  BEHIND,
  AFTER
}


