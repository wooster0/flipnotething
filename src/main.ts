import { ArtCanvas, Dither } from "./ArtCanvas";

WebAssembly.instantiateStreaming(
    fetch("../main.wasm")
).then(wasm => {
    console.log(wasm);
    const exports = wasm.instance.exports;
    console.log(exports);
    const art_canvas = new ArtCanvas(exports);

    art_canvas.setupDitherButtons(
        document.getElementById("art-canvas-dither-buttons")!
    );
    art_canvas.setupColorButtons(
        document.getElementById("art-canvas-color-buttons")!
    );

    const canvas = document.getElementById("art-canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;

    art_canvas.setupCanvas(canvas, ctx);
    art_canvas.addEventListeners(canvas);
    art_canvas.draw(ctx);
});
