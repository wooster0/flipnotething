compile_wasm() {
    if [ "$PROD" = 1 ]; then
        echo "yes";
        EXTRA_FLAGS="-O ReleaseSmall --strip";
    fi
    zig build-lib -target wasm32-freestanding-none -dynamic $EXTRA_FLAGS src/main.zig
}

compile_js() {
    if [ "$PROD" = 1 ]; then
        echo "yes";
        EXTRA_FLAGS="--minify";
    fi
    npx esbuild src/main.ts --tsconfig=tsconfig.json --bundle --outdir=. $EXTRA_FLAGS
}

if [ "$PROD" = 1 ]; then
    compile_wasm;
    compile_js;
else
    # the delay makes sure it doesn't autorefresh too early
    # (and ends up refreshing multiple times)
    npx live-server --port=6969 --wait=500 --open=src/index.html &
    while true; do
        # PROD=1;
        compile_wasm;
        compile_js;
        inotifywait --event modify src/**;
    done
fi
