#!/usr/bin/env bash
set -eo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/textures"

SSS_BASE="https://www.solarsystemscope.com/textures/download"
NASA_BASE="https://astropedia.astrogeology.usgs.gov/download"

echo "Downloading celestial body textures..."
echo "Target: $ASSETS_DIR"
echo ""

download() {
  local rel_path="$1"
  local url="$2"
  local dest="$ASSETS_DIR/$rel_path"
  local dir
  dir="$(dirname "$dest")"

  mkdir -p "$dir"

  if [ -f "$dest" ]; then
    echo "  SKIP  $rel_path (exists)"
    return
  fi

  echo "  GET   $rel_path"
  if curl -fsSL --retry 2 --max-time 120 -o "$dest" "$url"; then
    echo "  OK    $rel_path ($(du -h "$dest" | cut -f1))"
  else
    echo "  FAIL  $rel_path — $url"
    rm -f "$dest"
  fi
}

echo "--- Solar System Scope (CC-BY 4.0) ---"
download "mercury/2k_surface.jpg"      "$SSS_BASE/2k_mercury.jpg"
download "mercury/8k_surface.jpg"      "$SSS_BASE/8k_mercury.jpg"
download "venus/2k_surface.jpg"        "$SSS_BASE/2k_venus_surface.jpg"
download "venus/8k_surface.jpg"        "$SSS_BASE/8k_venus_surface.jpg"
download "venus/2k_atmosphere.jpg"     "$SSS_BASE/2k_venus_atmosphere.jpg"
download "earth/2k_day.jpg"            "$SSS_BASE/2k_earth_daymap.jpg"
download "earth/2k_night.jpg"          "$SSS_BASE/2k_earth_nightmap.jpg"
download "earth/8k_day.jpg"            "$SSS_BASE/8k_earth_daymap.jpg"
download "earth/8k_night.jpg"          "$SSS_BASE/8k_earth_nightmap.jpg"
download "mars/2k_surface.jpg"         "$SSS_BASE/2k_mars.jpg"
download "mars/8k_surface.jpg"         "$SSS_BASE/8k_mars.jpg"
download "jupiter/2k_surface.jpg"      "$SSS_BASE/2k_jupiter.jpg"
download "jupiter/8k_surface.jpg"      "$SSS_BASE/8k_jupiter.jpg"
download "saturn/2k_surface.jpg"       "$SSS_BASE/2k_saturn.jpg"
download "saturn/8k_surface.jpg"       "$SSS_BASE/8k_saturn.jpg"
download "saturn/2k_ring_alpha.png"    "$SSS_BASE/2k_saturn_ring_alpha.png"
download "saturn/8k_ring_alpha.png"    "$SSS_BASE/8k_saturn_ring_alpha.png"
download "uranus/2k_surface.jpg"       "$SSS_BASE/2k_uranus.jpg"
download "neptune/2k_surface.jpg"      "$SSS_BASE/2k_neptune.jpg"
download "moon/2k_surface.jpg"         "$SSS_BASE/2k_moon.jpg"
download "moon/8k_surface.jpg"         "$SSS_BASE/8k_moon.jpg"

echo ""
echo "--- NASA/JPL USGS Astrogeology (public domain) ---"
download "io/2k_surface.jpg"           "${NASA_BASE}/Io/Voyager-Galileo/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.jpg"
download "europa/2k_surface.jpg"       "${NASA_BASE}/Europa/Voyager-Galileo/Europa_Voyager_GalileoSSI_global_mosaic_500m.jpg"
download "ganymede/2k_surface.jpg"     "${NASA_BASE}/Ganymede/Voyager-Galileo/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.jpg"
download "titan/2k_surface.jpg"        "${NASA_BASE}/Titan/Cassini/Titan_ISS_P19658_Mosaic_Global_4008.jpg"

echo ""
echo "Done. Run this script again to fill in any failed downloads."
