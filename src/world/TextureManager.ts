/**
 * Texture manager: loads and caches procedural textures for world generation.
 * Textures are loaded from /textures/ directory and cached for reuse.
 */
import * as THREE from 'three';

/** Texture cache to avoid loading the same texture multiple times */
const textureCache = new Map<string, THREE.Texture>();

/** Texture loader instance */
const loader = new THREE.TextureLoader();

/**
 * Load a texture from the textures directory.
 * Returns a cached texture if already loaded.
 * @param name - Texture filename without extension (e.g., 'concrete', 'brick')
 */
export function loadTexture(name: string): THREE.Texture {
  if (textureCache.has(name)) {
    return textureCache.get(name)!;
  }

  const texture = loader.load(`/textures/${name}.jpg`);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  textureCache.set(name, texture);
  return texture;
}

/**
 * Create a textured material for Kowloon buildings.
 * @param textureName - Texture name (concrete, brick, metal, ground, wood)
 * @param color - Optional color tint (default: white = no tint)
 * @param repeat - Texture repeat factor (default: 1)
 */
export function createKowloonMaterial(
  textureName: string,
  color?: number,
  repeat: number = 1
): THREE.MeshLambertMaterial {
  const texture = loadTexture(textureName);
  texture.repeat.set(repeat, repeat);
  
  return new THREE.MeshLambertMaterial({
    map: texture,
    color: color ?? 0xffffff,
  });
}

/**
 * Get a random Kowloon building material.
 * Uses old/dirty textures for authentic look.
 */
export function getRandomBuildingMaterial(): THREE.MeshLambertMaterial {
  const textures = ['concrete_dirty', 'brick_old', 'metal', 'rusty_metal'];
  const textureName = textures[Math.floor(Math.random() * textures.length)];
  return createKowloonMaterial(textureName);
}

/**
 * Get a random wall material for interior walls.
 */
export function getWallMaterial(): THREE.MeshLambertMaterial {
  const textures = ['wall', 'concrete_dirty', 'brick_old'];
  const textureName = textures[Math.floor(Math.random() * textures.length)];
  return createKowloonMaterial(textureName);
}

/**
 * Get a wood material (old/dirty).
 */
export function getWoodMaterial(): THREE.MeshLambertMaterial {
  const textures = ['wood', 'wood_old'];
  const textureName = textures[Math.floor(Math.random() * textures.length)];
  return createKowloonMaterial(textureName);
}

/**
 * Get a metal material.
 */
export function getMetalMaterial(): THREE.MeshLambertMaterial {
  const textures = ['metal', 'rusty_metal'];
  const textureName = textures[Math.floor(Math.random() * textures.length)];
  return createKowloonMaterial(textureName);
}

/**
 * Get a ground/floor material.
 */
export function getGroundMaterial(): THREE.MeshLambertMaterial {
  const textures = ['ground', 'street', 'tile'];
  const textureName = textures[Math.floor(Math.random() * textures.length)];
  return createKowloonMaterial(textureName);
}

/**
 * Get a fabric/tarp material.
 */
export function getFabricMaterial(): THREE.MeshLambertMaterial {
  return createKowloonMaterial('fabric');
}

/**
 * Get a cardboard material.
 */
export function getCardboardMaterial(): THREE.MeshLambertMaterial {
  return createKowloonMaterial('cardboard');
}

/**
 * Clear texture cache (for cleanup).
 */
export function clearTextureCache(): void {
  textureCache.forEach(texture => texture.dispose());
  textureCache.clear();
}
