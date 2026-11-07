#!/bin/bash
# Macht aus einem Bild ein verkleinertes WebP für die Webseite.
#
#   tools/optimize-image.sh <bild> [breite]
#
# Breite in Pixeln (Standard: 1680) – Faustregel ist die doppelte Anzeigegröße:
#   1680  Banner / volle Breite
#    860  zwei Bilder nebeneinander
#    560  Logo-Raster
#
# Das Ergebnis landet in images/<name>.webp, danach wird das passende <img>-Tag ausgegeben.
# Benötigt cwebp (brew install webp).

set -euo pipefail

if [ $# -lt 1 ]; then
    sed -n '2,12p' "$0"
    exit 1
fi

input=$1
width=${2:-1680}
name=$(basename "${input%.*}" | tr 'A-Z ' 'a-z_')
output="$(cd "$(dirname "$0")/.." && pwd)/images/$name.webp"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Bilder mit Monitor-Farbprofil (z. B. Screenshots) nach sRGB umrechnen, sonst verschieben sich die Farben
source=$input
profile=$(sips -g profile "$input" | awk -F': ' '/profile/{print $2}')
case "$profile" in
    *sRGB*|"<nil>"|"") ;;
    *)
        source="$tmp/srgb.png"
        sips -s format png --matchTo "/System/Library/ColorSync/Profiles/sRGB Profile.icc" "$input" --out "$source" >/dev/null
        ;;
esac

original_width=$(sips -g pixelWidth "$source" | awk '/pixelWidth/{print $2}')
[ "$width" -gt "$original_width" ] && width=$original_width

case "$input" in
    *.png|*.PNG)
        # Grafiken: verlustfrei oder verlustbehaftet – je nachdem, was kleiner ist
        cwebp -quiet -m 6 -q 88 -sharp_yuv -alpha_filter best -resize "$width" 0 "$source" -o "$tmp/lossy.webp"
        cwebp -quiet -z 9 -lossless -resize "$width" 0 "$source" -o "$tmp/lossless.webp"
        if [ "$(stat -f%z "$tmp/lossless.webp")" -le "$(stat -f%z "$tmp/lossy.webp")" ]; then
            cp "$tmp/lossless.webp" "$output"
        else
            cp "$tmp/lossy.webp" "$output"
        fi
        ;;
    *)
        cwebp -quiet -m 6 -q 80 -sharp_yuv -resize "$width" 0 "$source" -o "$output"
        ;;
esac

w=$(sips -g pixelWidth "$output" | awk '/pixelWidth/{print $2}')
h=$(sips -g pixelHeight "$output" | awk '/pixelHeight/{print $2}')
echo "$(basename "$output"): $(( $(stat -f%z "$output") / 1024 )) KB"
echo "<img src=\"images/$name.webp\" width=\"$w\" height=\"$h\" alt=\"\" loading=\"lazy\">"
