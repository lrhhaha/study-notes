import type { INode, IEdge } from "./types";

let nodeList: Array<INode> | null = null;
let edgeList: Array<IEdge> | null = null;

const fileSelector = document.getElementById("file-selector")!;
const workerBtn = document.getElementById("worker-btn")!;

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
    // console.log(dataList);
  };

  reader.readAsText(file); // 读取为文本
});

// workerBtn.addEventListener("click", () => {
//   useWebWorker();
// });

// function useWebWorker() {
//   let myWorker = new Worker("./worker.ts");

//   myWorker.postMessage({
//     data: dataList,
//   });
// }
