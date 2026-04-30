const cdnCandidate = "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.min.js";
const localCandidate = "./three.module.min.js";
const isFileProtocol = globalThis.location && globalThis.location.protocol === "file:";
const canUseRemoteModule = !globalThis.location || !isFileProtocol;
const candidates = [];

if (!isFileProtocol) {
  try {
    const localResponse = await fetch(new URL(localCandidate, import.meta.url), { method: "HEAD", cache: "no-store" });
    if (localResponse.ok) {
      candidates.push(localCandidate);
    }
  } catch (error) {
    candidates.length = 0;
  }
}

candidates.push(...(canUseRemoteModule ? [cdnCandidate] : []), "./three-lite.js");

let loadedModule = null;

for (const candidate of candidates) {
  try {
    loadedModule = await import(candidate);
    if (loadedModule && loadedModule.Scene && loadedModule.WebGLRenderer) {
      break;
    }
  } catch (error) {
    loadedModule = null;
  }
}

if (!loadedModule) {
  throw new Error("Three.js adapter could not load any renderer module.");
}

export default loadedModule;
