function heavyCalculation() {
  console.log("工作线程开始大量计算...");
  const start = performance.now();

  let result = 0;
  // 进行一千万次计算
  for (let i = 0; i < 10000000; i++) {
    result += Math.sqrt(i) * Math.sin(i) * Math.cos(i) * Math.tan(i);
  }

  const end = performance.now();
  console.log(`工作线程计算完成，耗时: ${(end - start).toFixed(2)}ms`);
  return result;
}

// 监听message事件，并接收数据
self.addEventListener("message", (event) => {
  console.log(event.data)
  // 直接运行繁重任务，不会影响主线程
  const res = heavyCalculation();

  // 将计算结果回传给主线程
  self.postMessage(res);
});