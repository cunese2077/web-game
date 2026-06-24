// 画布初始化
const width = window.innerWidth > 480 ? 480 : window.innerWidth;
const height = window.innerHeight > 650 ? 650 : window.innerHeight - 20;

const canvas = document.getElementById("canvas");
canvas.width = width;
canvas.height = height;

const ctx = canvas.getContext("2d");

export { width, height, canvas, ctx };
