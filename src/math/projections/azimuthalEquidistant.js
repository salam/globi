const { sin, cos, atan2, sqrt, asin, PI } = Math;
const RAD = PI / 180;
const DEG = 180 / PI;

export const azimuthalEquidistant = {
  project(lat, lon, centerLat, centerLon) {
    const phi = lat * RAD;
    const lam = lon * RAD;
    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;

    const cosC = sin(phi0) * sin(phi) + cos(phi0) * cos(phi) * cos(lam - lam0);
    const c = Math.acos(Math.max(-1, Math.min(1, cosC)));

    if (c < 1e-10) return { x: 0, y: 0 };

    const k = c / sin(c);
    const x = k * cos(phi) * sin(lam - lam0);
    const y = k * (cos(phi0) * sin(phi) - sin(phi0) * cos(phi) * cos(lam - lam0));
    return { x, y };
  },

  inverse(x, y, centerLat, centerLon) {
    const rho = sqrt(x * x + y * y);
    if (rho > PI + 1e-6) return null;
    if (rho < 1e-10) return { lat: centerLat, lon: centerLon };

    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;
    const c = rho;
    const sinC = sin(c);
    const cosC = cos(c);

    const phi = asin(cosC * sin(phi0) + (y * sinC * cos(phi0)) / rho);
    const lam = lam0 + atan2(
      x * sinC,
      rho * cos(phi0) * cosC - y * sin(phi0) * sinC
    );

    let lonDeg = lam * DEG;
    lonDeg = ((lonDeg + 180) % 360 + 360) % 360 - 180;
    return { lat: phi * DEG, lon: lonDeg };
  },

  isVisible() {
    return true;
  },
};
