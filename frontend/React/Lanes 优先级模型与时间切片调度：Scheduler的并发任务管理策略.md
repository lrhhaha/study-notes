什么是并发
React 如何防止渲染任务阻塞主线程（双 workLoop）
如何 fiber 构建循环的中断与恢复
任务优先级打断（同步渲染与异步渲染）

# 并发 & 并行

在文章正式开始前，先简单梳理一下计算机科学中的并发和并行，它们分别描述了两种对任务的不同处理方案。

并发：单个处理器通过时间片轮转的方式，实现多个任务交替执行，由于每个时间片很短，看起来多个任务像是同时执行。
并行：多个处理器同时执行不同任务。

以生活中的例子举例，假设有一家服装店：

- 并发就像店里只有一名工作人员，他轮转地为顾客介绍商品、收款、打包货物。
- 并行则像店里有多名工作人员，分别负责介绍商品、收款、打包货物。

> 总结：并发的特点在于及时响应，并行则在于同时处理。

# React 双工作循环

在 React 中，由于状态的变更（如 setState 的调用）所导致页面的重新渲染可以看作是一个任务（渲染任务）。而这个任务是由多个工作单元所构成的，任务的执行过程实际就是工作单元按顺序执行的过程，当所有工作单元执行完毕，则称此任务完成。

而 React 应用中可能同时存在多个任务，这些任务需要按照一定顺序执行，而因为 JS 是单线程语言，主线程在执行上述任务的过程中，无法响应如用户交互等事件，造成应用卡顿的现象。

为了使任务执行和响应事件之间取得平衡，React 需要设计一个调度方案。可以从宏观上理解为：React 保存了一个任务队列，队列中的任务会按某种顺序提取出来执行，并且每执行完一个任务后，React 会检查这一轮从任务开始执行到此刻，是否超过了 5ms，如没超过则取出下一个任务执行（此任务执行完毕后再次进行检测）；如果超过了 5ms，则将下一次任务调度放到宏任务队列中，从而让出主线程去处理其他事件。此机制就是 React 的任务调度循环。

所谓的“fiber”我们暂且将其理解为上述任务中的工作单元即可。即 fiber 节点等同于工作单元，多个工作单元组成了一个渲染任务。\
而 fiber 构建循环则是建立于 fiber 架构之上的。

渲染任务执行的过程，其实就是工作单元的执行过程，在此过程中，React 也会对工作单元的执行过程进行检测，每当一个工作单元执行完毕，也会判断任务开始到此刻是否超过了 5ms，如果没超过则取出下一个工作单元进行执行；如超过，则中断任务，让出主线程。（当主线程处理完其他事件后，任务调度循环会取出本次应该执行的任务，如果此任务时此前中断的任务，则可以会有中断处继续执行，无需从头执行）。

# 并发特性概述

在 React 中，由于状态的变更（如 setState 的调用）所导致页面的重新渲染可以看作是一个任务（渲染任务）。在 React16 之前，有两个核心问题：

1. 渲染任务不可中断，无法及时响应用户的操作，造成应用卡顿的风险。
2. 渲染任务无法根据优先级排序，后面触发的高优先级任务需要等待之前的低优先级任务执行完毕之后才能执行，造成用户体验不佳。

为了解决以上问题，React16 推出来 Fiber 架构，并且基于 Fiber 架构将不可中断的 stack reconciler 重构为可中断的 fiber reconciler，并且辅以优先级系统，优先响应高优先级任务，优化用户体现。

以上的解决方案，正是 React 并发特性（Concurrent Features）的基础。

React 的并发特性是一种渲染策略，旨在提升应用的响应能力。它允许 React 在执行渲染任务时根据优先级中断当前工作，优先处理高优先级的任务（如点击、输入），之后再恢复低优先级的渲染任务。

在 API 层面的体现：使用 createRoot 开启并发渲染机制，使用 useDeferredValue、startTransition 等 API 显式控制更新的优先级。
在底层的体现：渲染任务的可中断与恢复。

React 之所以能拥有并发能力，底层依靠以下三个概念：

- Fiber 架构 —— 底层架构
  - 需要实现并发能力，重点是可中断/恢复的渲染。Fiber 架构为可中断渲染提供了底层数据结构的支持。将整个更新任务拆分为多个工作单元，每个 Fiber 节点代表一个工作单元。从数据结构上让可中断渲染成为可能。
- Scheduler —— 架构驱动
  - Fiber 架构为可中断渲染提供了数据结构上的支持，同时也需要一个新的调度方式与之匹配，去控制渲染过程（否则还是使用旧的同步运行方式，Fiber 架构将无法发挥能力）
  - 借助时间切片，控制任务的执行时间，防止长期占用主线程（todo：根据其他文章在补充）。Scheduler 则提供了此能力。
- lanes 模型 —— 任务优先级策略
  - 不同的任务分为不同的优先级。高优先级任务可以打断低优先级任务，以实现重要任务的及时响应。lanes 模型为不同任务赋予不同优先级，配合时间切片实现高优先级任务打断低优先级任务的功能。

接下来将介绍上述三者是如何配合实现`渲染过程不阻塞主线程，及高优先级任务打断低优先级任务`这一并发渲染需要具备的底层能力的。

基于 Fiber 架构，将渲染任务拆分为多个工作单元（为可中断渲染提供数据结构层面的支持），时间切片，释放主线程，任务调度，根据优先级执行任务

# 优先级系统

优先级系统用于区分任务的紧急程度，React 根据任务不同的优先级安排不同的执行执行时机，也是实现高优先级任务打断低优先级任务的依据。

## lanes 优先级系统

React 自身拥有 Lanes 优先级，在 Fiber 节点中以 lanes 属性记录。

Lanes 优先级系统使用二进制数字代表优先级，数字越小优先级越高。

```javascript
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
```

## 事件优先级

在 React 中，还有另外一套优先级系统——事件优先级。

react 中的事件都是包装过的合成事件，每种事件都会带有不同的优先级。我们通过点击或者其它事件出发绑定的监听事件的时候就会带上对应的优先级。

使用 getEventPriority 函数，通过事件名称获取对应的优先级。

```javascript
export function getEventPriority(domEventName: DOMEventName) {
  switch (domEventName) {
    // ...some code...
    case "cancel":
    case "click":
      return DiscreteEventPriority;
    default:
      return DefaultEventPriority;
  }
}
```

## Scheduler 优先级系统

Scheduler 是一个独立的任务调度系统，所以它拥有自己的优先级系统。

Scheduler 的优先级系统将任务的优先级分为了：

```javascript
const ImmediatePriority = 1;
const UserBlockingPriority = 2;
const NormalPriority = 3;
const LowPriority = 4;
const IdlePriority = 5;
```

Scheduler 会根据任务不同的优先级，分配不同的过期时间：
节选部分 unstable_scheduleCallback 函数代码，

```javascript
var maxSigned31BitInt = 1073741823;

// Times out immediately
var IMMEDIATE_PRIORITY_TIMEOUT = -1;
// Eventually times out
var USER_BLOCKING_PRIORITY_TIMEOUT = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
// Never times out
var IDLE_PRIORITY_TIMEOUT = maxSigned31BitInt;

function unstable_scheduleCallback() {
  // ...some code...

  var timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;
      break;
  }

  var expirationTime = startTime + timeout;

  // ...some code...
}
```

注意：上述 startTime 的定义同样在 unstable_scheduleCallback 中，关键逻辑为 startTime = currentTime + delay。其中 delay 代表当前任务需要被延迟的时间。

## 优先级之间的互相转换

- lanes 优先级转事件优先级
  通过函数[lanesToEventPriority](https://github.com/facebook/react/blob/v18.3.1/packages/react-reconciler/src/ReactEventPriorities.new.js#L70)实现，传入 lanes 优先级即可得到对应的事件优先级

- 事件优先级转 scheduler 优先级
  通过上面的 unstable_scheduleCallback 函数中的 switch 语句转换

一般而言，我们只需要了解 lanes 优先级和事件优先级是 React 中的优先级，而 Scheduler 优先级是 Scheduler 库自身的优先级。\
React 中的任务最终需要通过 Scheduler 进行调度，所以当 React 中触发了某个事件，赋予了优先级之后，需要进行`lanes优先级 -> 事件优先级 -> Scheduler优先级`的转换。

# Fiber 架构

Fiber 架构在之前的文章中有聊到，本文只简单提及其核心作用。

在 Fiber 架构被创造出来之前，React 的渲染任务是一整个任务，即一旦开始执行便不可暂停与恢复。

为了防止渲染过程阻塞主线程，需要设计渲染任务可暂停与恢复的渲染架构。于是 Fiber 架构就被创造出来了，为 React 的可中断渲染提供数据结构上的支持。

每个 Fiber 节点代表一个组件节点或原生元素节点，同时也代表渲染任务中的一个工作单元。依靠 child、sibling、return 节点形成链式树状结构，从结构上支持遍历的中断与恢复（知道自己从哪里来，该往哪里去）。

在执行渲染任务的过程中，可以以工作单元（Fiber 节点）为颗粒度暂停渲染，让出主线程转而去响应其他事件，处理完毕后再回来恢复渲染任务。（此过程的工作单元的执行与暂停需要 Scheduler 进行调度，Fiber 架构只提供数据结构上的支持）。

![fiber任务拆分](../assets/images/fiber拆分工作单元.png)

# Scheduler

[Scheduler](https://github.com/facebook/react/tree/main/packages/scheduler)是一个功能上独立于 React 的依赖包，主要实现了`时间切片`和`优先级系统`，用于`控制任务的执行过程`，其官方描述为：

> This is a package for cooperative scheduling in a browser environment. It is currently used internally by React, but we plan to make it more generic.\
> 可译为：
> 这是一个用于在浏览器环境中进行协作式调度的包。目前它被 React 内部使用，但我们计划使其更加通用。

## 任务创建与调度

Scheduler 通过暴露 unstable_scheduleCallback 函数，给使用者创建任务，并自动进度调度。

```javascript
function unstable_scheduleCallback(priorityLevel, callback, options) {}
```

unstable_scheduleCallback 会创建任务加入到任务队列中，然后调用 schedulePerformWorkUntilDeadline 函数进行调度。

schedulePerformWorkUntilDeadline 函数如下所示，会根据不同的环境选择不同的调度方案，在正常浏览器中，会使用 MessageChannel 发布任务调度的消息。

```javascript
let schedulePerformWorkUntilDeadline;
if (typeof localSetImmediate === "function") {
  // Node.js and 旧版本IE.
  // ...some code...
} else if (typeof MessageChannel !== "undefined") {
  // 浏览器环境，使用MessageChannel

  // DOM and Worker environments.
  // We prefer MessageChannel because of the 4ms setTimeout clamping.
  const channel = new MessageChannel();
  const port = channel.port2;
  // 监听任务调度的信息，并执行performWorkUntilDeadline
  channel.port1.onmessage = performWorkUntilDeadline;
  // 发布任务调度消息
  schedulePerformWorkUntilDeadline = () => {
    port.postMessage(null);
  };
} else {
  // 低版本浏览器
  // ...some code...
}
```

MessageChannel 将任务调度加入到宏任务队列中，浏览器将通过事件循环机制，在合适的事件调用此宏任务，即执行上面代码中的 performWorkUntilDeadline 函数。

```javascript
const performWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    // scheduledHostCallback是我们在requestHostCallback中赋值的flushWork
    const currentTime = getCurrentTime();
    startTime = currentTime;
    const hasTimeRemaining = true;
    let hasMoreWork = true;
    try {
      // scheduledHostCallback的核心就是执行下面将会提到的workLoop，它将会返回workLoop的返回值。
      // 如果返回值 hasMoreWork 为true就说明任务没执行完还要发起下一次调度
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
    } finally {
      if (hasMoreWork) {
        // 如还有剩余任务，则重新请求调度（即上面提到了MessageChannel）
        schedulePerformWorkUntilDeadline();
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  } else {
    isMessageLoopRunning = false;
  }
  needsPaint = false;
};
```
performWorkUntilDeadline中将会正式调用scheduledHostCallback执行渲染任务（具体执行方式见文章后续的workLoop），并且通过其返回值判断是否有剩余任务，如果有的话，则通过MessageChannel重新发起调度，等待浏览器事件循环机制执行，确保不会阻塞主线程。

## 时间切片

时间切片的含义在于，每执行完一个任务后，检查本轮耗时是否超过时间片范围，如超过则让出主线程，并在下一轮事件循环中继续执行任务。

实现时间分片的主要函数之一为 shouldYieldToHost，它的作用在于检测当前时间切片的时间是否耗尽，是否需要让出主线程。

```javascript
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  // frameInterval为时间片，React中默认为5ms
  if (timeElapsed < frameInterval) {
    // The main thread has only been blocked for a really short amount of time;
    // smaller than a single frame. Don't yield yet.
    return false;
  }

  // ...some code...
}
```

### 工作循环

实现时间分片功能，除了上述判断当前时间片是否耗尽的函数以外，还需要使用循环来控制任务的执行及中断。如下图所示：

![工作循环](../assets/images/时间片工作循环.png)
即任务列表中的任务并非以同步的方式一次性执行，而是每执行完一个任务后，判断时间片是否耗尽，再决定继续执行任务还是让出主线程，等待下一次任务调度。

#### Scheduler 中的工作循环

在 React 中，每当状态改变而触发的渲染任务会存放在任务队列 taskQueue 中，我们不能一次性地清空任务队列（可能会阻塞主线程，引起应用卡顿），而应该使用循环配合时间片的方式去调度任务的执行。

而负责调度 taskQueue 执行的调度器则是 Scheduler，它控制的循环可称为`任务调度循环`，

具体体现为 workLoop 函数，此循环会不断从任务队列中取出任务执行，并且调用 shouldYieldToHost 函数进行判断，在适当时机让出主线程。
以下为 workLoop 函数节选，完整代码在[这里](https://github.com/facebook/react/blob/v18.3.1/packages/scheduler/src/forks/Scheduler.js#L189)阅读

```javascript
function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  // 从timerQueue中提取过期任务到taskQueue中
  advanceTimers(currentTime);
  // 通过小顶堆获取第一个最高优的任务，但是要注意我们并没有从taskQueue中删除
  currentTask = peek(taskQueue);
  while (
    currentTask !== null &&
    !(enableSchedulerDebugging && isSchedulerPaused)
  ) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost()) // 判断是不是过期
    ) {
      // 任务没有超时并且时间片时间已耗尽
      // This currentTask hasn't expired, and we've reached the deadline.
      break;
    }
    // 获取任务的回调函数
    const callback = currentTask.callback;
    if (typeof callback === 'function') {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      // 回调是不是已经过期
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      if (enableProfiling) {
        markTaskRun(currentTask, currentTime);
      }
      // 执行任务，并返回任务是否中断还是已执行完成
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      // 如果callback执行之后的返回类型是function类型就把又赋值给currentTask.callback，说明没执行完。没有执行完就不会执行pop逻辑，下一次返回的还是当前任务
      if (typeof continuationCallback === 'function') {
        currentTask.callback = continuationCallback;
      } else {
      // 不是函数说明当前任务执行完，弹出来就行
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      advanceTimers(currentTime);
    } else {
      // 执行的方法不存在就应该删除
      pop(taskQueue);
    }
    // 取出下一个任务
    currentTask = peek(taskQueue);
  }
  // 如果task队列没有清空, 返回true。 等待Scheduler调度下一次回调
  // Return whether there's additional work
  if (currentTask !== null) {
    return true;
  } else {
  // task队列已经清空, 返回false.
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}
​

```

可以理解为，Scheduler 的任务调度循环控制的颗粒度为`任务层面`。

#### reconciler 中的工作循环

细心的同学可能发现了，上述任务调度循环中提到“完成某个任务后，会检测本轮任务调度所花费的时间”，那么如果有一个非常庞大的任务，它的执行时间远超 5ms，那么如果 React 也需等待它执行完毕后才能进行判断，从而让出主线程，那么此任务的执行过程整个 React 应用也是出于一个长时间的阻塞。\

上述提到的隐患的确是存在的，为了避免单个任务执行时间过长，从而阻塞主线程，React 除了上述提到的任务调度循环，还设计了另一个颗粒度更细的循环机制加以辅助——`fiber构建循环`。

而此循环是存在于 react-reconciler 包中，而不是 Scheduler 包中，因为 fiber 工作单元的执行属于协调过程。

上面我们提到了，React 借助 Fiber 架构，将`一整个渲染任务拆分成多个工作单元`（即 Fiber 节点），每个工作单元的执行过程就是 Reconciler 构建 workInProgress 树的过程。当某个任务中的所有工作单元执行完成之后，那么此任务也就执行完成了。

为了让整个渲染过程具备更高的灵活性，在 fiber 工作单元执行的过程中，也有一个工作循环对其进行控制，即 fiber 构建循环。

同样地，在 fiber 构建的过程中，每执行完一个工作单元，就会调用 shouldYieldToHost（代码中导入时会重命名为 shouldYield）判断时间切片是否超时，如没超时则继续执行下一个工作单元，否则将会中断当前任务，让出主线程。且得益于 Fiber 架构的链式树状结构，在下次任务恢复时，可从中断的工作单元处恢复执行，而无需重新执行整个任务。
fiber 构建循环的源码可在[这里](https://github.com/facebook/react/blob/v18.3.1/packages/react-reconciler/src/ReactFiberWorkLoop.new.js#L1829-L1834)阅读。

注意下面源码中的 performUnitOfWork 函数即是 fiber 工作单元的执行函数，workInProgress 记录着当前需要执行的 fiber 节点，如 workInProgress 的值为 null，则证明当前任务的所有工作单元都已执行完毕。

```javascript
function workLoopConcurrent() {
  // Perform work until Scheduler asks us to yield
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

#### 双工作循环总结

上述 Scheduler 和 Reconciler 中的两个工作循环，分别从任务层面和 fiber 工作单元的层面进行控制，使得 React 应用在执行渲染任务的过程中，能够及时主动地让出主线程，响应其他事件。

它们的关系如下图所示：
![React双工作循环](../assets/images/React双workLoop.png)

至此，React 通过双工作循环与时间切片，已经解决了同步执行渲染任务导致应用卡顿的问题了。

让关键任务永不等待，可以使用 requestIdleCallbak，使用其 IdleDeadline.timeRemaining()判断当前帧是否有空闲时间，从而决定是否要执行下一个工作单元即可。
但是，因为 requestIdleCallback 存在。。。问题。

所以 Scheduler 需要编写一个时间切片的功能，其核心是在适当的时候让出主线程，防止渲染任务阻塞主线程。
