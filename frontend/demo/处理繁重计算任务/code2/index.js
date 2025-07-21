let dataList = null;

const fileSelector = document.getElementById("file-selector");
const workerBtn = document.getElementById("worker-btn");

fileSelector.addEventListener("change", (event) => {
  const file = event.target.files[0];

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const obj = JSON.parse(content);
    dataList = obj?.nodes;
  };

  reader.readAsText(file); // 读取为文本
});


workerBtn.addEventListener('click', () => {
  useWebWorker()
})

function useWebWorker() {
  let myWorker = new Worker("./worker.js");

  myWorker.postMessage({
    //   按 region 分组，计算出每一类 region 下 value 平均值、最大值、最小值、中位值、总和
    data: dataList,
  });
}
