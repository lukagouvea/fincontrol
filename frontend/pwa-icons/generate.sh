#!/bin/sh
# Gera os ícones PNG do PWA em ../public a partir dos SVGs (requer ImageMagick).
#   favicon.svg (cantos arredondados) -> pwa-192x192.png, pwa-512x512.png
#   maskable.svg (quadrado cheio)     -> pwa-maskable-512x512.png, apple-touch-icon.png
# No maskable, o desenho precisa caber no círculo central de 80% (zona segura).
set -eu
cd "$(dirname "$0")"
out=../public
r() { convert -background none -density 1536 "$1" -resize "$2x$2" "PNG32:$out/$3"; }
r "$out/favicon.svg" 192 pwa-192x192.png
r "$out/favicon.svg" 512 pwa-512x512.png
r maskable.svg 512 pwa-maskable-512x512.png
r maskable.svg 180 apple-touch-icon.png
