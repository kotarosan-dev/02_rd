const TWO_PI = Math.PI * 2;

export const DoubleSide = 2;

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(vector) {
    this.x = vector.x;
    this.y = vector.y;
    this.z = vector.z;
    return this;
  }
}

class Object3D {
  constructor() {
    this.children = [];
    this.position = new Vector3();
    this.rotation = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.scale.setScalar = (value) => {
      this.scale.x = value;
      this.scale.y = value;
      this.scale.z = value;
      return this.scale;
    };
    this.userData = {};
  }

  add(...objects) {
    objects.forEach((object) => {
      if (object) {
        this.children.push(object);
      }
    });
  }

  remove(object) {
    this.children = this.children.filter((child) => child !== object);
  }

  traverse(callback) {
    callback(this);
    this.children.forEach((child) => {
      if (child.traverse) {
        child.traverse(callback);
      } else {
        callback(child);
      }
    });
  }

  lookAt() {}
}

export class Scene extends Object3D {
  constructor() {
    super();
    this.background = null;
  }
}

export class Group extends Object3D {}

export class PerspectiveCamera extends Object3D {
  constructor(fov = 42, aspect = 1, near = 0.1, far = 100) {
    super();
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  updateProjectionMatrix() {}
}

export class AmbientLight extends Object3D {
  constructor(color, intensity) {
    super();
    this.color = color;
    this.intensity = intensity;
  }
}

export class DirectionalLight extends Object3D {
  constructor(color, intensity) {
    super();
    this.color = color;
    this.intensity = intensity;
  }
}

class Geometry {
  constructor(type, params = {}) {
    this.type = type;
    this.params = params;
  }

  dispose() {}
}

export class CircleGeometry extends Geometry {
  constructor(radius) {
    super("circle", { radius });
  }
}

export class RingGeometry extends Geometry {
  constructor(innerRadius, outerRadius) {
    super("ring", { innerRadius, outerRadius });
  }
}

export class BoxGeometry extends Geometry {
  constructor(width, height, depth) {
    super("box", { width, height, depth });
  }
}

export class CylinderGeometry extends Geometry {
  constructor(radiusTop, radiusBottom, height) {
    super("cylinder", { radiusTop, radiusBottom, height });
  }
}

export class IcosahedronGeometry extends Geometry {
  constructor(radius) {
    super("poly", { radius, sides: 12 });
  }
}

export class SphereGeometry extends Geometry {
  constructor(radius) {
    super("sphere", { radius });
  }
}

export class OctahedronGeometry extends Geometry {
  constructor(radius) {
    super("poly", { radius, sides: 8 });
  }
}

export class TetrahedronGeometry extends Geometry {
  constructor(radius) {
    super("poly", { radius, sides: 4 });
  }
}

export class BufferGeometry extends Geometry {
  constructor() {
    super("line", { points: [] });
  }

  setFromPoints(points) {
    this.params.points = points;
    return this;
  }
}

class Material {
  constructor(config = {}) {
    this.color = config.color || 0x1d2630;
    this.opacity = config.opacity === undefined ? 1 : config.opacity;
    this.transparent = Boolean(config.transparent);
  }

  dispose() {}
}

export class MeshStandardMaterial extends Material {}
export class MeshBasicMaterial extends Material {}
export class LineBasicMaterial extends Material {}

export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

export class Line extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

function hex(color) {
  return `#${Number(color || 0).toString(16).padStart(6, "0").slice(-6)}`;
}

function rotate(point, rotation) {
  const cy = Math.cos(rotation.y);
  const sy = Math.sin(rotation.y);
  const cx = Math.cos(rotation.x);
  const sx = Math.sin(rotation.x);
  const x1 = point.x * cy - point.z * sy;
  const z1 = point.x * sy + point.z * cy;
  const y1 = point.y * cx - z1 * sx;
  const z2 = point.y * sx + z1 * cx;
  return new Vector3(x1, y1, z2);
}

function project(point, width, height) {
  const depth = Math.max(4, point.z + 13);
  const scale = Math.min(width, height) * 0.72 / depth;
  return {
    x: width / 2 + point.x * scale,
    y: height * 0.58 - point.y * scale,
    scale
  };
}

function worldPosition(local, transform) {
  const scaled = new Vector3(local.x * transform.scale.x, local.y * transform.scale.y, local.z * transform.scale.z);
  const rotated = rotate(scaled, transform.rotation);
  return new Vector3(rotated.x + transform.position.x, rotated.y + transform.position.y, rotated.z + transform.position.z);
}

function nextTransform(parent, object) {
  return {
    position: worldPosition(object.position, parent),
    rotation: new Vector3(parent.rotation.x + object.rotation.x, parent.rotation.y + object.rotation.y, parent.rotation.z + object.rotation.z),
    scale: new Vector3(parent.scale.x * object.scale.x, parent.scale.y * object.scale.y, parent.scale.z * object.scale.z)
  };
}

export class WebGLRenderer {
  constructor(config = {}) {
    this.canvas = config.canvas;
    this.context = this.canvas.getContext("2d");
    this.pixelRatio = 1;
  }

  setPixelRatio(value) {
    this.pixelRatio = value || 1;
  }

  setSize(width, height) {
    this.canvas.width = Math.floor(width * this.pixelRatio);
    this.canvas.height = Math.floor(height * this.pixelRatio);
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  render(scene) {
    const width = this.canvas.width / this.pixelRatio;
    const height = this.canvas.height / this.pixelRatio;
    this.context.clearRect(0, 0, width, height);
    this.context.save();
    this.context.lineCap = "round";
    this.context.lineJoin = "round";
    drawChildren(this.context, scene.children, width, height, {
      position: new Vector3(),
      rotation: new Vector3(),
      scale: new Vector3(1, 1, 1)
    });
    this.context.restore();
  }
}

function drawChildren(context, children, width, height, transform) {
  children.forEach((object) => {
    const current = nextTransform(transform, object);
    if (object.geometry && object.material) {
      drawObject(context, object, current, width, height);
    }
    if (object.children && object.children.length > 0) {
      drawChildren(context, object.children, width, height, current);
    }
  });
}

function drawObject(context, object, transform, width, height) {
  const material = object.material;
  const color = hex(material.color);
  context.globalAlpha = material.opacity === undefined ? 1 : material.opacity;
  context.fillStyle = color;
  context.strokeStyle = color;

  if (object.geometry.type === "line") {
    const points = object.geometry.params.points || [];
    if (points.length < 2) {
      return;
    }
    context.beginPath();
    points.forEach((point, index) => {
      const screen = project(worldPosition(point, transform), width, height);
      if (index === 0) {
        context.moveTo(screen.x, screen.y);
      } else {
        context.lineTo(screen.x, screen.y);
      }
    });
    context.lineWidth = 1.2;
    context.stroke();
    return;
  }

  const center = project(transform.position, width, height);
  const params = object.geometry.params;
  const baseSize = Math.max(4, center.scale * (params.radius || params.width || params.outerRadius || 0.6));

  if (object.geometry.type === "box") {
    const boxWidth = Math.max(5, center.scale * params.width);
    const boxHeight = Math.max(5, center.scale * params.height);
    context.fillRect(center.x - boxWidth / 2, center.y - boxHeight, boxWidth, boxHeight);
    return;
  }

  if (object.geometry.type === "ring") {
    context.beginPath();
    context.arc(center.x, center.y, Math.max(4, center.scale * params.outerRadius), 0, TWO_PI);
    context.lineWidth = Math.max(1, center.scale * (params.outerRadius - params.innerRadius));
    context.stroke();
    return;
  }

  if (object.geometry.type === "circle" || object.geometry.type === "sphere") {
    context.beginPath();
    context.arc(center.x, center.y, baseSize, 0, TWO_PI);
    context.fill();
    return;
  }

  const sides = params.sides || 6;
  context.beginPath();
  for (let index = 0; index < sides; index += 1) {
    const angle = -Math.PI / 2 + (index / sides) * TWO_PI + transform.rotation.y * 0.4;
    const x = center.x + Math.cos(angle) * baseSize;
    const y = center.y + Math.sin(angle) * baseSize;
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
  context.fill();
}

