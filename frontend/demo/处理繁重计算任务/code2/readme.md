本 demo 展示了一千万次循环的繁重运算对页面渲染的阻塞效果。

并尝试使用requestIdleCallback和web worker两种方案进行优化。

三个JS文件分别为：
- heavyCalc.js：未经优化，直接运行繁重代码
- idleCallback.js：拆分繁重任务，使用requestIdleCallback进行优化
- webWorker.js：创建独立的工作线程进行优化

直接打开 index.html 即可进行观察与调试。