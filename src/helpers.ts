export function getWasmInt32(memory: WebAssembly.Memory, address: number): number {
    return new Int32Array(
        memory.buffer,
        address,
        1,
    )[0];
}

export function getWasmUint32(memory: WebAssembly.Memory, address: number): number {
    return new Uint32Array(
        memory.buffer,
        address,
        1,
    )[0];
}

export function setWasmUint32(memory: WebAssembly.Memory, address: number, value: number) {
    new Uint32Array(
        memory.buffer,
        address,
        1,
    )[0] = value;
}

// export function getValue(export_value: WebAssembly.ExportValue): number {
//     WebAssembly.ExportValue;
//     return new Uint32Array(
//         memory.buffer,
//         global.value,
//         1,
//     )[0];
// }

export type Point = {
    x: number;
    y: number;
};

export type Color = {
    r: number;
    g: number;
    b: number;
};

// you need to use either a class or do  it like this
export function colorToUint32(color: Color): number {
    const uint32 = new Uint8Array(4);
    uint32[0] = color.r;
    uint32[1] = color.g;
    uint32[2] = color.b;
    uint32[3] = 255;
    return new Uint32Array(uint32.buffer)[0];
}

// export default  Point;
