import type { INode, IEdge } from "./types";
import useIdleCallback from './idleCallback'

let nodeList: Array<INode> | null = null;
let edgeList: Array<IEdge> | null = null;

const fileSelector = document.getElementById("file-selector")!;
const workerBtn = document.getElementById("worker-btn")!;
const idleBtn = document.getElementById("idle-btn")!;

fileSelector.addEventListener("change", (event: Event) => {
  const target = event.target as HTMLInputElement;

  const file = target.files![0];

  const reader = new FileReader();
  reader.onload = (e: ProgressEvent<FileReader>) => {
    const content = e.target?.result as string;
    const obj = JSON.parse(content);
    console.log(obj);
    nodeList = obj?.nodes as Array<INode>;
    edgeList = obj?.edges as Array<IEdge>
  };

  reader.readAsText(file); // 读取为文本
});

// 使用web worker方式
workerBtn.addEventListener("click", () => {
  let myWorker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module'
  });

  myWorker.postMessage({
    nodeList,
    edgeList
  });
});

// 使用requestIdleCallback方式
idleBtn.addEventListener("click", () => {
  useIdleCallback(nodeList!, edgeList!);
});



