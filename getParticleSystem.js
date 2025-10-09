import * as THREE from 'three';

const _VS = `
uniform float pointMultiplier;

attribute float size;
attribute float angle;
attribute vec4 aColor;

varying vec4 vColor;
varying vec2 vAngle;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = size * pointMultiplier / gl_Position.w;

  vAngle = vec2(cos(angle), sin(angle));
  vColor = aColor;
}`;

const _FS = `
uniform sampler2D diffuseTexture;

varying vec4 vColor;
varying vec2 vAngle;

void main() {
  vec2 coords = (gl_PointCoord - 0.5) * mat2(vAngle.x, vAngle.y, -vAngle.y, vAngle.x) + 0.5;
  gl_FragColor = texture2D(diffuseTexture, coords) * vColor;
}`;


function getLinearSpline(lerp) {

  const points = [];
  const _lerp = lerp;

  function addPoint(t, d) {
    points.push([t, d]);
  }

  function getValueAt(t) {
    let p1 = 0;

    for (let i = 0; i < points.length; i++) {
      if (points[i][0] >= t) {
        break;
      }
      p1 = i;
    }

    const p2 = Math.min(points.length - 1, p1 + 1);

    if (p1 == p2) {
      return points[p1][1];
    }

    return _lerp(
      (t - points[p1][0]) / (
        points[p2][0] - points[p1][0]),
      points[p1][1], points[p2][1]);
  }
  return { addPoint, getValueAt };
}

function getParticleSystem(params) {
  const { camera, emitter, parent, rate, texture } = params;
  // Avoids 2 problems
  // Main Problem 1: Constant Re-creation of Geometry Buffers (Pressure on the Garbage Collector)
  // Main Problem 2: Lack of a Disposal Method (GPU Memory Leak)
  const MAX_PARTICLES = 10000; // Define a Maximum Particle Capacity
  const uniforms = {
    diffuseTexture: {
      value: new THREE.TextureLoader().load(texture)
    },
    pointMultiplier: {
      value: window.innerHeight / (2.0 * Math.tan(30.0 * Math.PI / 180.0))
    }
  };
  const _material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: _VS,
    fragmentShader: _FS,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    vertexColors: true
  });

  let _particles = [];

  const geometry = new THREE.BufferGeometry();

  // Create array with maximum size, filled with zeros.
  const positions = new Float32Array(MAX_PARTICLES * 3); // 3 components (x, y, z)
  const sizes = new Float32Array(MAX_PARTICLES * 1);     // 1 components
  const colors = new Float32Array(MAX_PARTICLES * 4);    // 4 components (r, g, b, a)
  const angles = new Float32Array(MAX_PARTICLES * 1);    // 1 components

  // Creates attributes ONCE with maximum capacity.
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1).setUsage(THREE.DynamicDrawUsage));

  const _points = new THREE.Points(geometry, _material);

  parent.add(_points);

  const alphaSpline = getLinearSpline((t, a, b) => {
    return a + t * (b - a);
  });
  alphaSpline.addPoint(0.0, 0.0);
  alphaSpline.addPoint(0.6, 1.0);
  alphaSpline.addPoint(1.0, 0.0);

  const colorSpline = getLinearSpline((t, a, b) => {
    const c = a.clone();
    return c.lerp(b, t);
  });
  colorSpline.addPoint(0.0, new THREE.Color(0xFFFFFF));
  colorSpline.addPoint(1.0, new THREE.Color(0xff8080));

  const sizeSpline = getLinearSpline((t, a, b) => {
    return a + t * (b - a);
  });
  sizeSpline.addPoint(0.0, 0.0);
  sizeSpline.addPoint(1.0, 1.0);
 // max point size = 512; => console.log(ctx.getParameter(ctx.ALIASED_POINT_SIZE_RANGE));
  const radius = 0.5;
  const maxLife = 1.5;
  const maxSize = 3.0;
  let gdfsghk = 0.0;
  function _AddParticles(timeElapsed) {
    gdfsghk += timeElapsed;
    const n = Math.floor(gdfsghk * rate);
    gdfsghk -= n / rate;
    for (let i = 0; i < n; i += 1) {
      const life = (Math.random() * 0.75 + 0.25) * maxLife;
      _particles.push({
        position: new THREE.Vector3(
          (Math.random() * 2 - 1) * radius,
          (Math.random() * 2 - 1) * radius,
          (Math.random() * 2 - 1) * radius).add(emitter.position),
        size: (Math.random() * 0.5 + 0.5) * maxSize,
        colour: new THREE.Color(),
        alpha: 1.0,
        life: life,
        maxLife: life,
        rotation: Math.random() * 2.0 * Math.PI,
        rotationRate: Math.random() * 0.01 - 0.005,
        velocity: new THREE.Vector3(0, 1.5, 0),
      });
    }
  }

  function _UpdateGeometry() {
    // Access pre-allocated arrays directly.
    const positions = geometry.attributes.position.array;
    const sizes = geometry.attributes.size.array;
    const colors = geometry.attributes.aColor.array;
    const angles = geometry.attributes.angle.array;

    const particleCount = _particles.length;
    
    // Iterate over the active particles and fill the arrays.
    for (let i = 0; i < particleCount; i++) {
      const p = _particles[i];

      const i3 = i * 3;
      const i4 = i * 4;
      
      // Position (x, y, z)
      positions[i3 + 0] = p.position.x;
      positions[i3 + 1] = p.position.y;
      positions[i3 + 2] = p.position.z;

      // Color (r, g, b, a)
      colors[i4 + 0] = p.colour.r;
      colors[i4 + 1] = p.colour.g;
      colors[i4 + 2] = p.colour.b;
      colors[i4 + 3] = p.alpha;

      // Size and Angle
      sizes[i] = p.currentSize;
      angles[i] = p.rotation;
    }
    
    // Limits drawing to only the number of active particles.
    geometry.setDrawRange(0, particleCount);
    
    // Tell Three.js that the data has changed.
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.angle.needsUpdate = true;

  }
  _UpdateGeometry();

  function _UpdateParticles(timeElapsed) {
    for (let p of _particles) {
      p.life -= timeElapsed;
    }

    _particles = _particles.filter(p => {
      return p.life > 0.0;
    });

    for (let p of _particles) {
      const t = 1.0 - p.life / p.maxLife;
      p.rotation += p.rotationRate;
      p.alpha = alphaSpline.getValueAt(t);
      p.currentSize = p.size * sizeSpline.getValueAt(t);
      p.colour.copy(colorSpline.getValueAt(t));

      p.position.add(p.velocity.clone().multiplyScalar(timeElapsed));

      const drag = p.velocity.clone();
      drag.multiplyScalar(timeElapsed * 0.1);
      drag.x = Math.sign(p.velocity.x) * Math.min(Math.abs(drag.x), Math.abs(p.velocity.x));
      drag.y = Math.sign(p.velocity.y) * Math.min(Math.abs(drag.y), Math.abs(p.velocity.y));
      drag.z = Math.sign(p.velocity.z) * Math.min(Math.abs(drag.z), Math.abs(p.velocity.z));
      p.velocity.sub(drag);
    }

    _particles.sort((a, b) => {
      const d1 = camera.position.distanceTo(a.position);
      const d2 = camera.position.distanceTo(b.position);

      if (d1 > d2) {
        return -1;
      }
      if (d1 < d2) {
        return 1;
      }
      return 0;
    });
  }

  function update(timeElapsed) {
    _AddParticles(timeElapsed);
    _UpdateParticles(timeElapsed);
    _UpdateGeometry();
  }

  // Lack of a Disposal Method (GPU Memory Leak)
  function dispose() {
    // 1. Removes the object from the scene so that it is no longer rendered.
    parent.remove(_points);

    // 2. Frees GPU memory allocated for geometry (position, color, etc. buffers).
    geometry.dispose();

    // 3. Frees the GPU memory allocated for the material (shaders) and texture.
    _material.dispose();
    uniforms.diffuseTexture.value.dispose();

    // 4. Clear the particle array on the CPU to free up memory for JS objects.
    _particles = [];
  }
  
  return { update, dispose };
}

export { getParticleSystem };
