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
