const std = @import("std");

const ArtCanvas = @This();

// zig fmt: off
const brush_sizes = [_][]const u1{
    &.{
        1
    },
    &.{
        1,1,
        1,1,
    },
    &.{
        1,1,1,
        1,1,1,
        1,1,1,
    },
    &.{
        0,1,1,0,
        1,1,1,1,
        1,1,1,1,
        0,1,1,0
    },
    &.{
        0,1,1,1,0,
        1,1,1,1,1,
        1,1,1,1,1,
        1,1,1,1,1,
        0,1,1,1,0,
    },
    &.{
        0,1,1,1,1,0,
        1,1,1,1,1,1,
        1,1,1,1,1,1,
        1,1,1,1,1,1,
        1,1,1,1,1,1,
        0,1,1,1,1,0,
    },
};
// zig fmt: on

const Pixel = packed struct {
    r: u8,
    g: u8,
    b: u8,
    // later it should be possible to actually use an array of 3 values per pixel
    // and then render that using WebGL.
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
    a: u8 = 255,

    fn init(comptime r: f16, comptime g: f16, comptime b: f16) Pixel {
        return comptime Pixel{
            .r = @floatToInt(u8, r * 255),
            .g = @floatToInt(u8, g * 255),
            .b = @floatToInt(u8, b * 255),
        };
    }
};

// const DitherPixel = struct {
//     r: u8,
//     g: u8,
//     b: u8,
//     dither: Dither,
// };

const size: u32 = 300;
export const canvas_size: u32 = size;

/// This is the final result.
///
/// This is expected to be filled with white pixels initially.
export var pixels: [size * size]Pixel = undefined;

export fn fill(r: u8, g: u8, b: u8) void {
    for (pixels) |*pixel|
        pixel.* = Pixel{ .r = r, .g = g, .b = b };
}

/// This is an internal representation of part of the canvas and
/// contains any non-standard pixels that need special treatment
/// because they were not drawn using the default brush type.
///
/// This is expected to be filled with `Dither.none` initially.
export var dither_pixels: [size * size]Dither = undefined;

export var color: Pixel = Pixel.init(0, 0, 0);

fn getIndex(x: u32, y: u32) u32 {
    return x + (size * y);
}

const Dither = enum(u32) {
    none = 0,
    checkered = 1,
    chess = 2,
    horizontal = 3,
    vertical = 4,
};

export var dither: Dither = .none;

export fn applyDithering() callconv(.C) void {
    for (dither_pixels) |dither_pixel, index| {
        const x = index % size;
        const y = index / size;
        switch (dither_pixel) {
            .none => {},
            .checkered => {
                if (x % 2 == 0 and y % 2 == 0)
                    pixels[index] = Pixel.init(1, 1, 1);
            },
            .chess => {
                if ((x + y) % 2 == 0)
                    pixels[index] = Pixel.init(1, 1, 1);
            },
            .horizontal => {
                if (y % 2 == 0)
                    pixels[index] = Pixel.init(1, 1, 1);
            },
            .vertical => {
                if (x % 2 == 0)
                    pixels[index] = Pixel.init(1, 1, 1);
            },
        }
    }
}

export fn paint(
    x: u32,
    y: u32,
    brush_size_index: u32,
) callconv(.C) void {
    const brush = brush_sizes[brush_size_index];
    const brush_size = brush_size_index + 1;
    for (brush) |pixel, index| {
        if (pixel == 1) {
            const brush_x = index % brush_size;
            const brush_y = index / brush_size;
            const pixel_index = getIndex(x + brush_x, y + brush_y);
            pixels[pixel_index] = color;
            dither_pixels[pixel_index] = dither;
            // if ((index + (index / size)) % 2 == 0) {
            //     dither_pixels[getIndex(x + brush_x, y + brush_y)] =
            //         Pixel{
            //         .r = 0,
            //         .g = 0,
            //         .b = 0,
            //     };
            // }

            // if ((index + (index / canvas_size)) % 2 == 0)
            // //             pixel.* = color(0.25, 0.25, 0.25)
            // //         else
            // //             pixel.* = color(0.5, 0.5, 0.5);
            // //     }

        }
    }
}

// cool article: https://cliffle.com/blog/bare-metal-wasm/

fn abs(x: i32) u32 {
    return if (x < 0) @intCast(u32, -x) else @intCast(u32, x);
}

/// Draws a line.
///
/// Source: https://en.wikipedia.org/w/index.php?title=Bresenham%27s_line_algorithm&oldid=1089985341#All_cases
export fn line(
    from_x: u32,
    from_y: u32,
    to_x: u32,
    to_y: u32,
    brush_size_index: u32,
) callconv(.C) void {
    // std.math.absCast(x: anytype)
    var x0 = @intCast(i32, from_x);
    var y0 = @intCast(i32, from_y);
    var x1 = @intCast(i32, to_x);
    var y1 = @intCast(i32, to_y);
    var dx: i32 = @intCast(i32, abs(x1 - x0));
    var sx: i32 = if (x0 < x1) 1 else -1;
    var dy: i32 = -@intCast(i32, abs(y1 - y0));
    var sy: i32 = if (y0 < y1) 1 else -1;
    var err = dx + dy;

    while (true) {
        paint(@intCast(u32, x0), @intCast(u32, y0), brush_size_index);
        if (x0 == x1 and y0 == y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) {
            if (x0 == x1) break;
            err = err + dy;
            x0 = x0 + sx;
        }
        if (e2 <= dx) {
            if (y0 == y1) break;
            err = err + dx;
            y0 = y0 + sy;
        }
    }
}

// TODO: this is buggy and doesn't work for `const`s in stage1.
//       `export` everything here when 0.10 is out! (remove all other `export`s)
// comptime {
//     @export(size, .{ .name = "canvas_size" });
//     @export(pixels, .{ .name = "pixels" });
//     @export(brush_sizes.len, .{ .name = "brush_count" });
//     @export(paint, .{ .name = "paint" });
// }
export const brush_count: u32 = brush_sizes.len;
