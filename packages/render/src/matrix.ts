/**
 * Simple 4x4 matrix math utilities for perspective projection and view transforms.
 * Column-major layout matching WebGL / OpenGL conventions.
 */

export type Mat4 = Float32Array;

export function mat4Create(): Mat4 {
  const out = new Float32Array(16);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}

export function mat4Perspective(
  out: Mat4,
  fovRad: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1.0 / Math.tan(fovRad / 2);
  const nf = 1.0 / (near - far);

  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function mat4Translation(out: Mat4, x: number, y: number, z: number): Mat4 {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

export function mat4CameraView(
  out: Mat4,
  cx: number,
  cy: number,
  cz: number,
  yaw: number,
  pitch: number,
): Mat4 {
  const cosY = Math.cos(-yaw);
  const sinY = Math.sin(-yaw);
  const cosP = Math.cos(-pitch);
  const sinP = Math.sin(-pitch);

  const m00 = cosY;
  const m01 = sinY * sinP;
  const m02 = -sinY * cosP;

  const m10 = 0;
  const m11 = cosP;
  const m12 = sinP;

  const m20 = sinY;
  const m21 = -cosY * sinP;
  const m22 = cosY * cosP;

  out.fill(0);
  out[0] = m00;
  out[1] = m01;
  out[2] = m02;
  out[3] = 0;

  out[4] = m10;
  out[5] = m11;
  out[6] = m12;
  out[7] = 0;

  out[8] = m20;
  out[9] = m21;
  out[10] = m22;
  out[11] = 0;

  out[12] = -(m00 * cx + m10 * cy + m20 * cz);
  out[13] = -(m01 * cx + m11 * cy + m21 * cz);
  out[14] = -(m02 * cx + m12 * cy + m22 * cz);
  out[15] = 1;

  return out;
}

export function mat4Multiply(out: Mat4, a: Mat4, b: Mat4): Mat4 {
  const a00 = a[0] ?? 0, a01 = a[1] ?? 0, a02 = a[2] ?? 0, a03 = a[3] ?? 0;
  const a10 = a[4] ?? 0, a11 = a[5] ?? 0, a12 = a[6] ?? 0, a13 = a[7] ?? 0;
  const a20 = a[8] ?? 0, a21 = a[9] ?? 0, a22 = a[10] ?? 0, a23 = a[11] ?? 0;
  const a30 = a[12] ?? 0, a31 = a[13] ?? 0, a32 = a[14] ?? 0, a33 = a[15] ?? 0;

  let b0 = b[0] ?? 0, b1 = b[1] ?? 0, b2 = b[2] ?? 0, b3 = b[3] ?? 0;
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4] ?? 0; b1 = b[5] ?? 0; b2 = b[6] ?? 0; b3 = b[7] ?? 0;
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8] ?? 0; b1 = b[9] ?? 0; b2 = b[10] ?? 0; b3 = b[11] ?? 0;
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12] ?? 0; b1 = b[13] ?? 0; b2 = b[14] ?? 0; b3 = b[15] ?? 0;
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

export function mat4Invert(out: Mat4, a: Mat4): boolean {
  const a00 = a[0] ?? 0, a01 = a[1] ?? 0, a02 = a[2] ?? 0, a03 = a[3] ?? 0;
  const a10 = a[4] ?? 0, a11 = a[5] ?? 0, a12 = a[6] ?? 0, a13 = a[7] ?? 0;
  const a20 = a[8] ?? 0, a21 = a[9] ?? 0, a22 = a[10] ?? 0, a23 = a[11] ?? 0;
  const a30 = a[12] ?? 0, a31 = a[13] ?? 0, a32 = a[14] ?? 0, a33 = a[15] ?? 0;

  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;

  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return false;
  det = 1.0 / det;

  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

  return true;
}
