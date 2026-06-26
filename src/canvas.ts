// 画布初始化
const canvasWidth = window.innerWidth > 480 ? 480 : window.innerWidth;
const canvasHeight = window.innerHeight > 650 ? 650 : window.innerHeight - 20;

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

export const width: number = canvasWidth;
export const height: number = canvasHeight;
export { canvas, ctx };
