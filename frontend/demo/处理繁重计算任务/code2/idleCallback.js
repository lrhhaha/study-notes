const queue = [];

function useIdleCallback() {
  //   将一千万次循环任务，拆分为100个十万次循环任务（可根据实际情况，拆分为更小的任务）

  for (let i = 0; i < 100; i++) {
    const fn = () => {
      console.log(`任务${i}开始执行`);

      let result = 0;
      for (let j = 0; j < 100000; j++) {
        result += Math.sqrt(j) * Math.sin(j) * Math.cos(j) * Math.tan(j);
      }

      console.log(`任务${i}执行完毕`);
    };
    // push任务
    queue.push(fn);
  }
}

function handleQueue() {
  // 处理任务
  requestIdleCallback((idleDeadline) => {
    while (queue.length && idleDeadline.timeRemaining() > 2) {
      const fn = queue.shift();
      fn();
    }
    handleQueue();
  });
}

handleQueue();
