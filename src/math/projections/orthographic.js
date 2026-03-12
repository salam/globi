const { sin, cos, atan2, sqrt, asin, PI } = Math;
const RAD = PI / 180;
const DEG = 180 / PI;

export const orthographic = {
  project(lat, lon, centerLat, centerLon) {
    const phi = lat * RAD;
    const lam = lon * RAD;
    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;

    const x = cos(phi) * sin(lam - lam0);
    const y = cos(phi0) * sin(phi) - sin(phi0) * cos(phi) * cos(lam - lam0);
    return { x, y };
  },

  inverse(x, y, centerLat, centerLon) {
    const rho = sqrt(x * x + y * y);
    if (rho > 1 + 1e-6) return null;

    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;
    const c = asin(Math.min(1, rho));
    const sinC = sin(c);
    const cosC = cos(c);

    const phi = (rho < 1e-10)
      ? phi0
      : asin(cosC * sin(phi0) + (y * sinC * cos(phi0)) / rho);

    const lam = lam0 + atan2(
      x * sinC,
      rho * cos(phi0) * cosC - y * sin(phi0) * sinC
    );

    let lonDeg = lam * DEG;
    lonDeg = ((lonDeg + 180) % 360 + 360) % 360 - 180;
    return { lat: phi * DEG, lon: lonDeg };
  },

  isVisible(lat, lon, centerLat, centerLon) {
    const phi = lat * RAD;
    const lam = lon * RAD;
    const phi0 = centerLat * RAD;
    const lam0 = centerLon * RAD;
    const cosC = sin(phi0) * sin(phi) + cos(phi0) * cos(phi) * cos(lam - lam0);
    return cosC > 0;
  },
};
