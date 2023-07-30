import * as helpers from "./helpers";
import { Point, Color } from "./helpers";

/**
 * This is a multiplier used to make the art canvas look more pixelated.
 */
// TODO: it seems you can remove it
const multiplier = 1;//2;


export enum Dither {
    None = 0,
    Checkered = 1,
    Chess = 2,
    Horizontal = 3,
    Vertical = 4,
}
const dither_count = Object.values(Dither).length / 2;

export class ArtCanvas {
    readonly memory: WebAssembly.Memory;

    size: number;
    pixels: ImageData;
    brush_count: number;

    readonly dither: WebAssembly.Global;
    readonly color: WebAssembly.Global;

    paint: (x: number, y: number, brush_size_index: number) => void;
    line: (from_x: number, from_y: number, to_x: number, to_y: number, brush_size_index: number) => void;
    fill: (r: number, g: number, b: number) => void;
    applyDithering: () => void;

    brush_size_index: number;

    constructor(exports: WebAssembly.Exports) {
        this.memory = exports.memory as WebAssembly.Memory;

        this.size =
            helpers.getWasmUint32(
                this.memory,
                (exports.canvas_size as WebAssembly.Global).value
            );
        this.pixels =
            new ImageData(
                new Uint8ClampedArray(
                    this.memory.buffer,
                    (exports.pixels as WebAssembly.Global).value,
                    4 * this.size * this.size,
                ),
                this.size,
            );
        this.brush_count =
            helpers.getWasmUint32(
                this.memory,
                (exports.brush_count as WebAssembly.Global).value
            );

        this.dither = exports.dither as WebAssembly.Global;
        this.color = exports.color as WebAssembly.Global;

        this.paint = exports.paint as typeof this.paint;
        this.line = exports.line as typeof this.line;
        this.fill = exports.fill as typeof this.fill;
        this.applyDithering = exports.applyDithering as typeof this.applyDithering;

        this.brush_size_index = 0;//this.brush_count - 1;

        // // this.brush_count =
        // // exports.dither += 1;
        // helpers.setWasmUint32(
        //     memory,
        //     (exports.dither as WebAssembly.Global).value,
        //     100
        // );
        // console.log(helpers.getWasmUint32(memory, (exports.dither as WebAssembly.Global).value));
    }

    getMousePoint(event: MouseEvent): Point {
        return {
            x: event.offsetX - this.brush_size_index,/// multiplier,
            y: event.offsetY - this.brush_size_index /// multiplier,
        };
    }

    setDither(dither: Dither) {
        helpers.setWasmUint32(
            this.memory,
            this.dither.value,
            dither
        );
    }

    setColor(color: Color) {
        helpers.setWasmUint32(
            this.memory,
            this.color.value,
            helpers.colorToUint32(color)
        );
    }

    setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        canvas.width = this.size * multiplier;
        canvas.height = this.size * multiplier;
        ctx.imageSmoothingEnabled = false;
    }

    // The additional arithmetic here is needed because of some `px` weirdness
    // canvas.style.padding = `${2 + (this.brush_count - i) / 2 - 0.5}px`;

    setupDitherButtons(element: HTMLElement) {
        for (let i = 0; i < dither_count; i++) {
            const dither = i as Dither;

            const canvas = document.createElement("canvas");
            canvas.width = 5;
            canvas.height = 5;
            canvas.className = "art-canvas-brush-button";
            canvas.addEventListener("click", () => {
                this.setDither(dither);
            });
            element.appendChild(canvas);

            const ctx = canvas.getContext("2d")!;
            ctx.imageSmoothingEnabled = false;
            this.setDither(dither);
            this.paint(0, 0, 4);
            this.applyDithering();
            ctx.putImageData(this.pixels, 0, 0);

            this.fill(255, 255, 255);
        }
        this.setDither(Dither.None);
    }

    setupColorButtons(element: HTMLElement) {
        const colors = [
            { r: 0, g: 0, b: 0 },
            { r: 255, g: 0, b: 0 }, { r: 0, g: 255, b: 0 }, { r: 0, g: 0, b: 255 },
            { r: 255, g: 255, b: 255 },
        ];
        for (const color of colors) {
            const canvas = document.createElement("canvas");
            canvas.width = 5;
            canvas.height = 5;
            canvas.className = "art-canvas-brush-button";
            canvas.addEventListener("click", () => {
                this.setColor(color);
            });
            element.appendChild(canvas);

            const ctx = canvas.getContext("2d")!;
            ctx.imageSmoothingEnabled = false;
            this.fill(color.r, color.g, color.b);
            ctx.putImageData(this.pixels, 0, 0);
        }
        this.fill(255, 255, 255);
    }

    draw(ctx: CanvasRenderingContext2D) {
        const pixels = this.pixels;
        const applyDithering = this.applyDithering;

        function draw() {
            // TODO: do it lazily
            applyDithering();

            ctx.putImageData(pixels, 0, 0);
            // ctx.scale(2, 2);
            // ctx.drawImage(await createImageBitmap(pixels), 0, 0);
            // ctx.resetTransform();
            requestAnimationFrame(draw);
        }
        draw();

        this.pixels;

        // "The TL;DR, nothing async in a rAF callback"
        // if you zoom in, you need to draw the image data differently
        // and draw it in squares with inlines around them!
        // TODO: when you need to clear, just fill the canvas with a color,
        //       or that other way
    }

    addEventListeners(element: HTMLElement) {
        element.addEventListener("mousedown", event => {
            const point = this.getMousePoint(event);
            console.log(point);
            this.paint(point.x, point.y, this.brush_size_index);
        });
        element.addEventListener("mouseup", event => previousPoint = null);
        element.addEventListener("mouseleave", event => previousPoint = null);

        let scale = 1.0;
        let translation: Point = { x: 1.0, y: 1.0 };

        element.addEventListener("wheel", event => {
            const point = this.getMousePoint(event);
            if (event.ctrlKey) {
                // TODO: make zooming work on the whole document instead of only the canvas
                const previous_scale = scale;
                if (event.deltaY < 0)
                    scale += 0.1;
                else
                    scale -= 0.1;
                scale = Math.min(Math.max(scale, 1.0), 3.0);
                element.style.scale = scale.toString();

                // originx -= mousex / (scale * zoom) - mousex / scale;
                // originy -= mousey / (scale * zoom) - mousey / scale;
                // scale *= zoom;
                // const scale_diff = scale - previous_scale;
                // console.log(-(point.x * scale_diff),-(point.y * scale_diff));
                // canvas.style.translate = `${(point.x * scale_diff)}% ${(point.y * scale_diff)}%`;
            } else {
                if (event.deltaY < 0 && this.brush_size_index < this.brush_count - 1)
                    this.brush_size_index++;
                else if (this.brush_size_index != 0)
                    this.brush_size_index--;
            }
            event.preventDefault();
        });

        let previousPoint: Point | null = null;
        element.addEventListener("mousemove", event => {
            const point = this.getMousePoint(event);
            // fill(Math.random() * 255, Math.random() * 255, Math.random() * 255, Math.random() * 255);
            // paint(event.offsetX / 2, event.offsetY / 2, brush_size);

            // this.paint(point.x, point.y, brush_size_index, false);

            if (event.buttons == 1) {
                if (previousPoint != null) {
                    this.line(previousPoint.x, previousPoint.y, point.x, point.y, this.brush_size_index);
                }
                previousPoint = point;
            }
        });
    }
}
