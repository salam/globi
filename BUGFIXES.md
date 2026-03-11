# BUGFIXES

- [✔️] BUG1 - Globe rendering appears flat/non-spherical instead of a proper globe projection.
- [✔️] BUG1b - Glare-based shading looks artificial; remove glare and use smoother non-specular sphere shading.
- [✔️] BUG2 - Inspect/callout widget is not aligned to the selected marker and does not anchor at the marker screen position.
- [✔️] BUG3 - Compass HUD is missing even though compass visibility defaults should be enabled.
- [✔️] BUG3b - Viewer UI editor controls do not react reliably on change events (cross-browser).
- [✔️] BUG4 - Earth surface texture is not projected onto the sphere; it is drawn as a flat 2D overlay that does not rotate with the camera and has no occlusion (backface hiding).
- [✔️] BUG5 - Compass HUD at bottom-right is not clickable; clicking should reset globe to initial position (north at top, lat=0, lon=0). Also, compass lacked pointer-events.
- [✔️] BUG5b - Callout marker labels and leader lines always use hardcoded golden color (#f6b73c) instead of using each marker's assigned color.
