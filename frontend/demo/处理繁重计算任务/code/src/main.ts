import type { IData } from "./types";

let dataList: Array<IData> | null = null;

const fileSelector = document.getElementById("file-selector")!;
const workerBtn = document.getElementById("worker-btn")!;

fileSelector.addEventListener("change", (event: Event) => {
  const target = event.target as HTMLInputElement;

  const file = target.files![0];

  const reader = new FileReader();
  reader.onload = (e: ProgressEvent<FileReader>) => {
    const content = e.target?.result as string;
    const obj = JSON.parse(content);
    dataList = obj?.nodes as Array<IData>;
  };

  reader.readAsText(file); // 读取为文本
});

workerBtn.addEventListener("click", () => {
  useWebWorker();
});

function useWebWorker() {
  let myWorker = new Worker("./worker.js");

  myWorker.postMessage({
    data: dataList,
  });
}
