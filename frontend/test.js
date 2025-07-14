//微任务队列
const microQueue = [];
// 宏任务队列
const macroQueue = [];

// 添加微任务
const pushMicro = (fn) => microQueue.push(fn);
// 添加宏任务
const pushMacro = (fn) => macroQueue.push(fn);

// 主线程
const main = () => {
  console.log("a");
  pushMicro(() => {
    console.log("b");
    // 微任务中添加了新的微任务，也会在同一轮的事件循环中一起被清空
    pushMicro(() => {
      console.log("c");
    });
    pushMacro(() => {
      console.log("d");
    });
  });
  pushMacro(() => {
    console.log("e");
  });
  console.log("f");
};

// 处理任务队列（宏任务 + 微任务）
function handleQueue() {
  // 清空微任务队列
  while (microQueue.length) {
    const fn = microQueue.shift();
    fn();
  }

  // 执行宏任务队列的第一个任务
  if (macroQueue.length) {
    const fn = macroQueue.shift();
    fn();
  }

  // 重新清空微任务队列，并执行一个宏任务
  if (microQueue.length || macroQueue.length) handleQueue();
}

main(); // 输出：a, f, b, c, e, d
handleQueue();