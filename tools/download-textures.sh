#!/usr/bin/env bash
set -eo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/textures"

SSS_BASE="https://www.solarsystemscope.com/textures/download"

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
echo "--- NASA Earth Observatory (public domain) ---"
download "earth/land_ocean_ice_2048.png" "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57730/land_ocean_ice_2048.png"

echo ""
echo "--- USGS Astrogeology CKAN (public domain) ---"
CKAN_BASE="https://astrogeology.usgs.gov/ckan/dataset"
download "io/2k_surface.jpg"           "${CKAN_BASE}/f6924861-ce9c-490d-8a4b-7812a20f2de5/resource/a9fab679-8081-4144-9f58-45848836c8f5/download/full.jpg"
download "europa/2k_surface.jpg"       "${CKAN_BASE}/4080036f-afc5-422e-abe9-1c0c8e4f98ea/resource/3647e7b3-425e-4dcf-951b-cc4a22fb0129/download/europa_voyager_galileossi_global_mosaic_500m_1024.jpg"
download "ganymede/2k_surface.jpg"     "${CKAN_BASE}/e1422336-3291-4b65-b903-c942d53de073/resource/eb32abd7-fee2-47d1-9f96-9d7d8824cc3a/download/ganymede_voyager_galileossi_global_clrmosaic_1024.jpg"
download "titan/2k_surface.jpg"        "${CKAN_BASE}/8ee17e4e-26c6-4e22-9c23-bc9a4c7ed35e/resource/c3f3006c-3174-4716-920f-44f5dc749a4a/download/titan_iss_p19658_mosaic_global_1024.jpg"

echo ""
echo "Done. Run this script again to fill in any failed downloads."
