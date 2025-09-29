




# 并发 & 并行
在计算机科学中，并发和并行是两个专业的术语，描述了两种对任务的不同处理方案。

并发：单个处理器通过时间片轮转的方式，实现多个任务交替执行，由于每个时间片很短，看起来多个任务像是同时执行。
并行：多个处理器同时执行不同任务。

以生活中的例子举例，假设有一家服装店：
- 并发就像店里只有一名工作人员，他轮转地为顾客介绍商品、收款、打包货物。
- 并行则像店里有多名工作人员，分别负责介绍商品、收款、打包货物。

> 总结：并发的特点在于及时响应，并行则在于同时处理。

# 并发特性概述
React 的并发特性（Concurrent Features）是一种渲染策略，旨在提升应用的响应能力。它允许 React 在执行渲染任务时根据优先级中断当前工作，优先处理高优先级的任务（如点击、输入），之后再恢复低优先级的渲染任务。

在API层面的体现：使用createRoot开启并发渲染机制，使用useDeferredValue、startTransition等API显式控制更新的优先级。
在底层的体现：渲染任务的可中断与恢复。


React 之所以能拥有并发能力，底层依靠以下三个概念：
- Fiber 架构 —— 底层架构
  - 需要实现并发能力，重点是可中断/恢复的渲染。Fiber 架构为可中断渲染提供了底层数据结构的支持。将整个更新任务拆分为多个工作单元，每个 Fiber 节点代表一个工作单元。从数据结构上让可中断渲染成为可能。
- Scheduler —— 架构驱动
  - Fiber 架构为可中断渲染提供了数据结构上的支持，同时也需要一个新的调度方式与之匹配，去控制渲染过程（否则还是使用旧的同步运行方式，Fiber 架构将无法发挥能力）
  - 借助时间切片，控制任务的执行时间，防止长期占用主线程（todo：根据其他文章在补充）。Scheduler 则提供了此能力。
- lanes 模型 —— 任务优先级策略
  - 不同的任务分为不同的优先级。高优先级任务可以打断低优先级任务，以实现重要任务的及时响应。lanes 模型为不同任务赋予不同优先级，配合时间切片实现高优先级任务打断低优先级任务的功能。

接下来将介绍上述三者是如何配合实现`高优先级任务打断低优先级任务`这一并发渲染需要具备的底层能力的。


基于Fiber架构，将渲染任务拆分为多个工作单元（为可中断渲染提供数据结构层面的支持），时间切片，释放主线程，任务调度，根据优先级执行任务

# Fiber 架构

Fiber架构在之前的文章中有聊到，本文只简单提及其核心作用。

在Fiber架构被创造出来之前，React的渲染任务是一整个任务，一旦开始执行便不可暂停与恢复。

为了使React应用能更好地响应紧急任务，需要设计渲染任务可暂停与恢复的渲染架构。于是Fiber架构就被创造出来了，为React的可中断渲染提供数据结构上的支持。

每个Fiber节点代表一个组件节点或原生元素节点，同时也代表渲染任务中的一个工作单元。依靠child、sibling、return节点形成链式树状结构，从结构上支持遍历的中断与恢复（知道自己从哪里来，该往哪里去）。

在执行渲染任务的过程中，当有高优先级的任务被触发时，可以以工作单元（Fiber节点）为粒度暂停渲染，转而去处理高优先级任务，处理完毕后再回来恢复渲染任务。（此过程的工作单元的执行与暂停需要Scheduler进行调度，Fiber架构只提供数据结构上的支持）。

![fiber任务拆分](../assets/images/fiber拆分工作单元.png)

# Scheduler
[Scheduler](https://github.com/facebook/react/tree/main/packages/scheduler)是一个功能上独立于React的依赖包，主要实现了时间切片和优先级系统，其官方描述为：
> This is a package for cooperative scheduling in a browser environment. It is currently used internally by React, but we plan to make it more generic.
> 可译为：
> 这是一个用于在浏览器环境中进行协作式调度的包。目前它被 React 内部使用，但我们计划使其更加通用。

## 优先级系统
Scheduler的优先级系统将任务的优先级分为了：
``` javascript
const NoPriority = 0;
const ImmediatePriority = 1;
const UserBlockingPriority = 2;
const NormalPriority = 3;
const LowPriority = 4;
const IdlePriority = 5;
```


## 时间切片