const { PI } = Math;
const RAD = PI / 180;
const DEG = 180 / PI;

export const equirectangular = {
  project(lat, lon, centerLat, centerLon) {
    let deltaLon = lon - centerLon;
    deltaLon = ((deltaLon + 180) % 360 + 360) % 360 - 180;
    return {
      x: deltaLon * RAD,
      y: (lat - centerLat) * RAD,
    };
  },

  inverse(x, y, centerLat, centerLon) {
    const lat = centerLat + y * DEG;
    if (lat > 90 || lat < -90) return null;
    let lon = centerLon + x * DEG;
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    return { lat, lon };
  },

  isVisible() {
    return true;
  },
};
