# 前言

本文的主题为：在React应用中，从组件状态改变到页面更新发生了什么。

主要目的是通过这个过程，将前几篇零散的React源码知识串连起来，形成知识网络，便于理解。

所以本文将不会过多介绍React中的一些概念。

# 过程拆分

接下来我们会将整个过程按照发生的顺序进行拆分：

- 状态发生改变
- scheduler调度渲染任务
- render/reconcile 阶段
- commit 阶段

## 从状态更新说起

React 组件的重新，一般是由状态更新而引起的。也就是由 useState 返回的 setState 函数的调用所引起的。本小节将梳理 setState 函数被调用后发生了什么。

setState 函数在源码中的体现是 dispatchSetState 函数，其接收 3 个参数作为函数。

- fiber fiber节点的引用
- queue 当前hook对象的update对象链表
- action setXXX的参数，可为函数或普通值

然后在 useState 执行时，会使用 bind 函数提前绑定其前两个参数（这就是为什么React知道当setXXX被调用时，究竟需要修改哪个组件的哪个状态的原因），然后将返回的新函数命名为 setState，然后作为 useState 返回值的第二个元素。

所以平时我们在调用 setState 函数时，只需传入一个值（具体值或函数），作为 dispatchSetState 的第三个函数而执行。

dispatchSetState 函数执行时，具体会执行以下几个步骤：

1. 进行 Eager state 优化：比较上次的值和本次修改的值，如两者相等则不触发后续的更新步骤。
2. 为本次更新创建 update 对象
3. 将 update 对象挂载到当前 useState 的 hook 对象的 update 链表上（以环形链表的方式存储）
4. 调用 scheduleUpdateOnFiber 函数，发起后续更新。
   1. 从出发更新的 fiber 节点往上寻找其所有直接父节点，并标记此路径上 fiber 节点的 lanes 和 childLanes 属性（以表示当前节点有更新操作或其子孙节点存放更新操作，为后续 render 节点的 bailout 优化做铺垫）
   2. 将 root 节点丢给 scheduler 发起一次任务调度

## scheduler 任务调度

scheduler 基于 MessageChannel 发起任务的调度，MessageChannel 的通信是宏任务，浏览器通过事件循环机制调控，确保不会阻塞现有任务。

当进入任务执行阶段时，scheduler 从任务池中（通过小顶堆的方式）取出优先级最高的任务执行。

但任务执行的过程并非只是以同步的方式执行，因为一个渲染任务可能是比较庞大的，如果以同步的方式执行，则会阻塞主线程，导致用户的一些操作（如文本输入、UI交互）需要较长时间才会得到反馈，让用户产生应用卡顿的感觉。

为了使任务执行过程中能`及时响应`用户操作，scheduler会采用时间切片 + 任务调度循环 + 优先级模型的方式进行调控。

具体而言就是以时间片为单位执行任务，每执行完一个任务之后，会调用shouldYieldToHost函数判断当前时间片是否耗尽：如没耗尽则取出下一个任务执行；如耗尽则让出主线程并发起下一次任务调度。

todo：图片


=================

- schedulePerformWorkUntilDeadline 请求任务调度（通过 MessageChannel 发送消息）

- performWorkUntilDeadline 响应任务调度请求（监听）

  - workLoop 执行 scheduler 层的工作循环（执行具体渲染任务，并调用 shouldYieldToHost 判断），返回值 hasMoreWork 为是否有剩余任务
  - 根据 hasMoreWork 决定是否调用 schedulePerformWorkUntilDeadline 请求下一次的任务调度

================

上述是从宏观看任务调度的过程，接下来我们将深入一个任务的执行过程，分析其细节。

## render/reconcile 阶段

当 scheduler 取出一个渲染任务并执行时，则进入了 render/reconcile 阶段。

此过程的目的是：生成 workInProgress fiber tree。

基于 fiber 架构，一个渲染任务可以拆分为多个工作单元（即 fiber 节点），当一个任务的全部工作单元执行完毕，则视为当前渲染任务执行完毕。

整个阶段可视为循环执行 preformUnitOfWork 的过程，每执行一次 performUnitOfWork 可视为执行一个工作单元，生成当前节点对应的 workInProgress fiber 节点。

同样地，为了防止遍历执行工作单元而长期阻塞主线程，在循环执行 preformUnitOfWork 的过程中，也会有一个工作循环（可称为 Fiber 构建循环）用于判断当前时间切片是否使用完毕。值得一提的是，此 Fiber 构建循环是在 eact-reconciler 包中，而不是 Scheduler 包中，因为 Fiber 工作单元的执行属于协调过程。
todo：图片

===============
渲染任务执行的过程，实际就是工作单元执行的过程

Fiber 构建循环如下

- workLoopConcurrent
  - workInProgress !== null && !shouldYield()，则执行下一个工作单元

===============

### performUnitOfWork

接下来将拆分 performUnitOfWork 的执行过程：

performUnitOfWork 可视为两个阶段：

1. beginWork：主要工作为生成当前 fiber 节点的直接子节点
2. completeWork：标记 flags 及 subtreeFlags，创建 DOM 元素及标记 update

> 注意：虽然 performUnitOfWork 可分为 beginWork 和 completeWork 两个阶段，但并非一个工作单元执行完其 beginWork 和 completeWork 的逻辑，再执行下一个工作单元的 beginWork 和 complete。\
> 而是属于一个递归的过程：先从根节点往下执行其第一个子元素的 beginWork 逻辑，此过程为“递”；到达叶子节点之后，再往上执行 completeWork 的“归”操作。\
> 具体顺序可理解为：parent:beginWork -> child:beginWork -> child:completeWork -> sibling:beginWork -> sibling:completeWork -> parent:completeWork

#### beginWork

beginWork 中会先进行 bailout 优化的判断（根据 fiber 的 lanes 及 childLanes 属性判断。bailout 是跳过 re-render，即执行函数组件，而不是不遍历。即进入遍历流程后，发现符合 bailout 条件，则无需 re-render ）。

- bailout 判断条件：先判断 props / context 的实际值变化 ，再判断 lanes 和 childLanes 是否有工作要做：
  - 如果 props/context 无变化，且 lanes 和 childLanes 都无值，则当前整条分支 bailout（常见于状态更改的兄弟分支）
  - 如 props/context 无变化，lanes 无值，但 childLanes 有值，则当前 fiber 可 bailout，继续对其子树进行遍历（常见于状态发生改变的直接父级组件）

不能进行执行 bailout 优化的节点就需要执行 reconcileChildren，即进行 diff 算法对比，从而生成当前节点的所有直接子节点（diff 对比相关流程见[文章](https://github.com/lrhhaha/study-notes/blob/main/frontend/React/React%20%E5%8F%8C%E7%BC%93%E5%AD%98%E6%9E%B6%E6%9E%84%E4%B8%8E%20Diff%20%E7%AE%97%E6%B3%95%E4%BC%98%E5%8C%96.md)）

#### completeWork

当 beginWork 处理到叶子节点时，调用 completeUnitOfWork（核心为 completeWork）向上递归。

其作用主要为：

- 标记自身 flags 属性，代表在 commit 阶段需要如何修改 DOM（需要与 effectList 区分开）。以及向上收集 flags，标记父级节点的 subtreeFlags（类似 childLanes，代表其子孙元素是否需要更改 DOM）
- 对于 HostComponent（如 div、span），创建 DOM 节点或标记 update

todo：画一棵树说明此循环过程

### 总结：Fiber 构建循环中时间切片的判断时机

> performUnitOfWork 被包裹在循环中执行，那每个 performUnitOfWork 执行完毕的时机为：`找到下一个需要执行beginWork逻辑的fiber节点`。\
> 当处于“递”的过程且当前 fiber 节点有子节点时，`下一个需要执行beginWork的节点`就是其第一个子节点。\
> 而当处于“归”的过程时，如果当前节点有兄弟节点，那么`下一个需要执行beginWork的节点`就是其兄弟节点，否则需要往上执行其 parent 节点的 completeWork 逻辑，然后将其 parent 节点视为当前节点，寻找`下一个需要执行beginWork逻辑的节点`（即找其兄弟节点，如无，再对其 parent 执行 completeWork）。

## commit 阶段

当某个渲染任务执行完毕后（即其中的所有工作单元都执行完了 beginWork / completeWork），React 就会调用 commitRoot 函数进入 commit 阶段。

commit 阶段的主要作用：一次性地把更新提交到真实 DOM 上，并执行副作用函数和生命周期钩子。

整个 commit 阶段可理解为有三个同步子阶段 + 一个异步子阶段，分别如下所示：

- 同步阶段：
  - Before Mutation
  - Mutation
  - Layout
- 异步阶段：
  - Passive Effects

各个阶段的主要功能如下所示：

- beforeMutation 阶段：处理 DOM 变更前的准备工作，如执行旧的 useLayoutEffect 的 cleanup
- mutation 阶段：根据 flags 属性，对真实 DOM 更新（插入、更新、删除）
- （注：一般认为此时会进行 current 树与 workInProgress 树的切换）
- layout 阶段：ref 的绑定；执行新的 useLayoutEffect 回调，执行 componentDidMount/Update 等生命周期钩子
- （注：此时浏览器会绘制页面（paint））
- passive effects 阶段：
  - 旧的 useEffect cleanup 放入任务队列
  - 新的 useEffect 回调放入任务队列

> 补充：\
> 由上述四个子阶段的执行过程可知，useLayoutEffect 和 useEffect 的执行顺序如下：
>
> 1. 旧 useEffectLayout 的 cleanup
> 2. DOM 更新（但未绘制）
> 3. 新 useLayoutEffect 的回调
> 4. 浏览器绘制页面
> 5. 旧 useEffect 的 cleanup
> 6. 新 useEffect 的回调

# 总结
