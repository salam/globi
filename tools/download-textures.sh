#!/usr/bin/env bash
set -euo pipefail

ASSETS_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/textures"

SSS_BASE="https://www.solarsystemscope.com/textures/download"

declare -A TEXTURES=(
  # Solar System Scope (CC-BY 4.0)
  ["mercury/2k_surface.jpg"]="$SSS_BASE/2k_mercury.jpg"
  ["mercury/8k_surface.jpg"]="$SSS_BASE/8k_mercury.jpg"
  ["venus/2k_surface.jpg"]="$SSS_BASE/2k_venus_surface.jpg"
  ["venus/8k_surface.jpg"]="$SSS_BASE/8k_venus_surface.jpg"
  ["venus/2k_atmosphere.jpg"]="$SSS_BASE/2k_venus_atmosphere.jpg"
  ["earth/2k_day.jpg"]="$SSS_BASE/2k_earth_daymap.jpg"
  ["earth/2k_night.jpg"]="$SSS_BASE/2k_earth_nightmap.jpg"
  ["earth/8k_day.jpg"]="$SSS_BASE/8k_earth_daymap.jpg"
  ["earth/8k_night.jpg"]="$SSS_BASE/8k_earth_nightmap.jpg"
  ["mars/2k_surface.jpg"]="$SSS_BASE/2k_mars.jpg"
  ["mars/8k_surface.jpg"]="$SSS_BASE/8k_mars.jpg"
  ["jupiter/2k_surface.jpg"]="$SSS_BASE/2k_jupiter.jpg"
  ["jupiter/8k_surface.jpg"]="$SSS_BASE/8k_jupiter.jpg"
  ["saturn/2k_surface.jpg"]="$SSS_BASE/2k_saturn.jpg"
  ["saturn/8k_surface.jpg"]="$SSS_BASE/8k_saturn.jpg"
  ["saturn/2k_ring_alpha.png"]="$SSS_BASE/2k_saturn_ring_alpha.png"
  ["saturn/8k_ring_alpha.png"]="$SSS_BASE/8k_saturn_ring_alpha.png"
  ["uranus/2k_surface.jpg"]="$SSS_BASE/2k_uranus.jpg"
  ["neptune/2k_surface.jpg"]="$SSS_BASE/2k_neptune.jpg"
  ["moon/2k_surface.jpg"]="$SSS_BASE/2k_moon.jpg"
  ["moon/8k_surface.jpg"]="$SSS_BASE/8k_moon.jpg"
)

# NASA/JPL USGS Astrogeology — public domain
NASA_BASE="https://astropedia.astrogeology.usgs.gov/download"
declare -A NASA_TEXTURES=(
  ["io/2k_surface.jpg"]="${NASA_BASE}/Io/Voyager-Galileo/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.jpg"
  ["europa/2k_surface.jpg"]="${NASA_BASE}/Europa/Voyager-Galileo/Europa_Voyager_GalileoSSI_global_mosaic_500m.jpg"
  ["ganymede/2k_surface.jpg"]="${NASA_BASE}/Ganymede/Voyager-Galileo/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.jpg"
  ["titan/2k_surface.jpg"]="${NASA_BASE}/Titan/Cassini/Titan_ISS_P19658_Mosaic_Global_4008.jpg"
)

echo "Downloading celestial body textures..."
echo "Target: $ASSETS_DIR"
echo ""

download() {
  local rel_path="$1"
  local url="$2"
  local dest="$ASSETS_DIR/$rel_path"
  local dir="$(dirname "$dest")"

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
for rel_path in "${!TEXTURES[@]}"; do
  download "$rel_path" "${TEXTURES[$rel_path]}"
done

echo ""
echo "--- NASA/JPL USGS Astrogeology (public domain) ---"
for rel_path in "${!NASA_TEXTURES[@]}"; do
  download "$rel_path" "${NASA_TEXTURES[$rel_path]}"
done

echo ""
echo "Done. Run this script again to fill in any failed downloads."
