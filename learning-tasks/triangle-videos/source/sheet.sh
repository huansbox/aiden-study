#!/bin/sh
# Contact sheet of stills for review: sheet.sh <video> <out.jpg> <scene:sec>...
v=$1; out=$2; shift 2
args=""; for f in "$@"; do args="$args --frame $f"; done
files=$(node "$(dirname "$0")/render.mjs" "$v" $args)
in=""; for f in $files; do in="$in -i $f"; done
n=$#
ffmpeg -v error -y $in -filter_complex "concat=n=$n:v=1:a=0,scale=800:-1,tile=2x$(( (n+1)/2 ))" -frames:v 1 -q:v 4 "$out"
