#!/bin/sh
# Costruisce app.js (un solo file) dai sorgenti in app/src. Uso: sh app/build.sh
set -e
cd "$(dirname "$0")/.."
ESB=${ESBUILD:-npx --yes esbuild@0.24.2}
$ESB app/src/main.js --bundle --format=iife --target=es2019,safari14 --loader:.txt=text --minify --outfile=app.js --log-level=warning
V=$(sha1sum app.js | cut -c1-8)
sed -i "s/__VER__/$V/g" app.js
sed -i -E "s/app\.js\?v=[a-z0-9_]+/app.js?v=$V/" index.html
sed -i -E "s/const V='jca-[a-z0-9_]+'/const V='jca-$V'/" sw.js
echo "app.js $(wc -c < app.js) byte, versione $V"
