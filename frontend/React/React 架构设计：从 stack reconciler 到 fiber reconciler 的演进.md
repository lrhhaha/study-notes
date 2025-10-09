# 题目： React 架构设计：从 stack reconciler 到 fiber reconciler 的演进

# 前言

React 从 2013 年开源至今，经过了多个版本的迭代，而 React16 版本则是其中一个里程碑式的版本，因其开启了从 stack reconciler 到 fiber reconciler 的转变历程。
时至今日的 React19，Fiber 架构仍是底层架构。在近些版本的迭代中，React 基于 Fiber 架构丰富了并发模式的各种实现，由此可见 Fiber 架构的重要性。

本文将会分享 React16 之前 stack reconciler 的特点，以及其存在的隐患，从而引出 React 团队对 Fiber 架构的设计及如何使用 fiber reconciler 进行渲染优化。

# React 更新页面的基本流程

在正式开始介绍 stack reconciler 和 fiber reconciler 之前，我们先了解一下 React 更新页面的基本流程。

无论是在 React16 之前，或是之后，React 在进行页面更新时，都可以宏观地分解为两个阶段，分别是：

- Render / Reconciliation 阶段：又称协调阶段，是 React 在内存中构建虚拟 DOM 树的阶段。此阶段的核心为 Reconciler（协调器）。
- Commit 阶段：又称提交阶段，是 React 根据虚拟 DOM 树，将要修改的地方一次性提交到真实 DOM 上的阶段。此阶段的核心为 Renderer（渲染器）。

# stack reconciler 与 fiber reconciler 的前世今生

## stack reconciler 特点及局限性

在 React16 之前，当应用状态发生改变，宏观上会执行以下两部分的工作，以更新 UI：

1. Reconciler（协调器）会生成新的虚拟 DOM，并与旧的虚拟 DOM 进行对比，找出需要更新的部分。
2. Renderer（渲染器）根据 Reconciler 计算的结果，将需要更新的部分提交到真实 DOM 上。

Reconciler 在处理组件树的更新时，采用的是递归的方式，是一个`不可中断`的过程（即 stack reconciler），而 JS 作为单线程语言，在此过程中不能处理其他任务（如响应用户的输入操作等）。这就造成了应用交互卡顿的风险，且在递归的过程中，需要创建大量的调用栈，这在处理大型组件树的时候可能会导致栈溢出。

> 以 stack reconciler 举个 🌰：\
> 当应用触发了状态变更，需要更新 UI，假设本次更新非常复杂，需要耗费 100ms，那么在这 100ms 内，如果用户进行了其他操作，如在输入框中输入文本。按照 stack reconciler 的设计，Reconciler 的工作过程不可中断，必须等待前一个渲染任务完成后，才能进行后续的输入框内容的变更。这就导致了应用卡顿的情况。

总结一下，React16 之前的 Reconciler 存在的问题：

- 采用递归方式处理组件树，可能会导致调用栈的溢出。
- 递归处理组件树的整个过程是不可中断的，这会阻塞用户的交互或其他重要的任务。
- 更新任务没有优先级的概念，无法区分重要任务（如用户输入后的页面渲染）与普通任务（如数据请求后的页面渲染），无法调度它们的执行顺序，普通任务可能会阻塞重要任务的执行。

> 注意：
> React16 之前页面更新的主要瓶颈是发生在 Render 阶段，即 stack reconciler 的设计上。
> 而 Commit 阶段更新真实 DOM 的过程并不存在明显的缺陷，所以 React16 的优化点主要集中在 reconciler 的实现方式上。

## fiber reconciler 设计与优化点

为此 React 团队计划在 React16 中重构 Reconciler 的逻辑，以实现应用在 Reconciler 工作时能`中断任务并优先处理优先级较高的任务`，如用户交互操作。并将这个新的方式称为 Fiber Reconciler。（而 Commit 阶段的 Renderer 的工作逻辑不变，其执行过程仍然是不可中断的）。

> 以 fiber reconciler 举个 🌰：\
> 对于上述耗时 100ms 的更新而言，当 Reconciler 工作到一半时，用户突然在输入框中输入文本，那么对于这种由于用户操作而造成的状态变更，在 React 中具有最高优先级。React 会暂停当前 Reconciler 的工作，转而去处理优先级更高的用户输入事件，将文本渲染出来，然后再回去处理刚才中断的任务。站在用户的角度，那个 100ms 的渲染确实是耗时较长，但整个 react 应用在此过程没有卡顿的情况出现，时刻能响应用户的操作。

> 简而言之：Fiber 架构`不是让渲染变快`，而是让`关键任务永不等待`。

为了实现 Render 阶段可中断，Fiber 架构比对之前的架构做出了如下重大改变：

- 将 stack reconciler 中一整个渲染任务拆分为多个任务，为渲染过程的可中断提供了可能性。

- 实现渲染任务的可中断与可恢复，在执行某个渲染任务时，如果应用触发了优先级更高的任务，则可暂停当前任务，优先处理高优先级任务，然后回来恢复之前的任务。

- 引入优先级调度系统，不同类型的更新任务有不同优先级，调度系统自动决定任务执行的先后顺序。

接下来将分析 Fiber 架构如何为可中断渲染的 fiber reconciler 提供数据结构层面的支持，主要体现在如下两点：

- 使用 Fiber 节点记录更多的信息，并可作为整个更新任务的工作单元使用。
- 以 Fiber 节点组成的链式树状结构替代原来的普通树状结构，为可终端遍历提供可能性。

# Fiber 节点 与 Fiber 树

Fiber 包含三层含义：

- 作为数据结构来说，一个 Fiber 节点对应一个 React 元素（React 组件、原生标签等），保存了该元素的所有信息，作为虚拟 DOM 的节点使用。而 Fiber 节点组成的`链式树状结构`就是 Fiber 架构下虚拟 DOM 的实现方式。

- 作为架构来说，Reconciler 的生成虚拟 DOM 的过程是基于 Fiber 节点实现的可中断遍历的过程，此过程可称为 Fiber Reconciler。

- 作为工作单元来说，一个 Fiber 节点代表一个工作单元，保存了本次更新中该组件改变的状态、要执行的工作（需要被删除/被插入页面中/被更新...）。

为了实现不可中断的递归更新重构为可中断的遍历更新，之前所使用的虚拟 DOM 树的元素数据结构已无法满足需求（因普通树状结构无法不依靠外界而实现递归中断后的状态记录），需要 Fiber 节点提供相关属性以支持链式树状结构的搭建，以便在某个任务中断并恢复之后，Reconciler 知道下一个需要执行的任务是什么。

Fiber 节点与结构相关的属性有如下三个：

- child: 指向子 Fiber 节点
- sibling：指向右侧第一个兄弟 Fiber 节点
- return：指向父级 Fiber 节点

依靠上述三个属性，将各个 Fiber 节点连接成链式树状结构。假设有如下所示的 React 组件

```
<App>
  <Header />
  <Main>
    <Component1 />
    <Component2 />
  </Main>
</APP>
```

其 Fiber 树结构如图所示

![fiber链式树状结构](../assets/images/fiber链式树状结构.png)

Fiber 树的链式树状结构的遍历特点为：

- 深度优先遍历
- 处理当前节点，然后寻找下一个需要处理的节点
- 下一个节点的寻找逻辑为：
  - 有 child 节点则处理 child 节点
  - 无 child 节点或已处理完毕，则处理 sibling 节点
  - 没有 sibling 节点则回归 return 节点（return 节点寻找其 sibling 节点）

每个 Fiber 节点都保存了从哪里来，该往哪里去的信息（即使在某个节点处中断任务，后续仍可恢复遍历），这让可中断遍历提供了`结构`上的支持。（具体如何实现可中断的逻辑，需要使用 Scheduler 进行调度，本文暂不讨论这部分的逻辑）

# Fiber 节点关键属性

接下来介绍 Fiber 节点中的一些关键属性，并按照其功能进行分类介绍。

如下节选了部分源码定义

```typeScript
export type Fiber = {
  // Tag identifying the type of fiber.
  tag: WorkTag,

  // Unique identifier of this child.
  key: null | string,

  // The value of element.type which is used to preserve the identity during
  // reconciliation of this child.
  elementType: any,

  // The resolved function/class/ associated with this fiber.
  type: any,

  // The local state associated with this fiber.
  stateNode: any,

  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  return: Fiber | null,

  // Singly Linked List Tree Structure.
  child: Fiber | null,
  sibling: Fiber | null,

  // Input is the data coming into process this fiber. Arguments. Props.
  pendingProps: any, // This type will be more specific once we overload the tag.
  memoizedProps: any, // The props used to create the output.

  // A queue of state updates and callbacks.
  updateQueue: mixed,

  // The state used to create the output
  memoizedState: any,

  // Effect
  flags: Flags,
  subtreeFlags: Flags,
  deletions: Array<Fiber> | null,

  lanes: Lanes,
  childLanes: Lanes,

  // This is a pooled version of a Fiber. Every fiber that gets updated will
  // eventually have a pair. There are cases when we can clean up pairs to save
  // memory if we need to.
  alternate: Fiber | null,
};
```

## 标识和类型属性

以下属性用于标识某个 Fiber 节点的基本信息及身份标识

### key

作为元素的唯一标识，用于优化元素对比过程。

### tag

此属性标识了 Fiber 节点的类型，这个标记不仅用于区分不同类型的节点，更重要的是指导 React 如何处理这个节点。不同类型的节点有不同的处理逻辑和生命周期。

```typeScript
// tag属性的值为WorkTag类型
export type WorkTag = 0 | 1 | 2 | 3 |......

// FunctionComponent: 0,        // 函数组件
// ClassComponent: 1,           // 类组件
// IndeterminateComponent: 2,   // 未确定类型的组件
// HostRoot: 3,                 // 根节点
// ......
```

### elementType & type

elementType：创建 Fiber 时传入的“原始”组件类型

type：实际用于渲染的组件的类型

这两个属性比较容易混淆，列举如下三个例子帮助理解：

（1）对于原生元素而言，两者相同，就是标签名称

```
<div>Hello</div>
// elementType → 'div'
// type → 'div'
```

（2）对于普通组件而言，两者相同，指向组件本身

```
function MyComponent() { return <div>Hello</div>; }
// elementType → MyComponent（函数）
// type → MyComponent（函数）
```

（3）对于高阶组件返回的组件而言，两者有明显区别

可理解为 type 是解包之后的组件（elementType.type === type）

```
const Comp = React.memo(MyComponent);
// elementType → Memo 对象 { type: MyComponent, ... }
// type → MyComponent（函数本身）
```

## 树状结构相关属性

Fiber 节点通过以下三个属性形成链式树状结构

### return

指向父 Fiber 节点

### child

指向第一个子 Fiber 节点

### sibling

指向下一个兄弟 Fiber 节点

## 状态相关属性

当 React 应用进行页面更新时，有的组件的 state 或 props 会发生改变，有的则不发生变化，需要使用相关属性记录它们的值，以便进行数据更新或进行 memo 优化。

### memoizedProps

上一次渲染时使用的 props

### memoizedState

上一次渲染时使用的 state

### pendingProps

新的待处理的 props

### updateQueue

存储更新对象的队列

## 副作用相关属性

如下属性标记了下次更新页面时，某个 Fiber 节点需要执行的副作用相关的信息

### flags

标记该 Fiber 节点在 commit 阶段需要执行的副作用（如插入、更新、删除等），可能存在多个副作用。

在 React 中，使用二进制数字代表不同的副作用，并使用`与运算`的结果记录所有副作用。

```javascript
export const NoFlags = /*                      */ 0b0000000000000000000000000000000;
export const PerformedWork = /*                */ 0b0000000000000000000000000000001;
export const Placement = /*                    */ 0b0000000000000000000000000000010;
export const Update = /*                       */ 0b0000000000000000000000000000100;
export const Cloned = /*                       */ 0b0000000000000000000000000001000;
export const ChildDeletion = /*                */ 0b0000000000000000000000000010000;
export const ContentReset = /*                 */ 0b0000000000000000000000000100000;
export const Callback = /*                     */ 0b0000000000000000000000001000000;
```

每个二进制数字代表一种副作用，且最小单位的副作用的二进制数字中只包含一个 1。如果某个 Fiber 节点需要执行两个副作用，则可使用它们对应的二进制数字进行与运算，得出拥有两个 1 的二进制数字，即可反推出这两个副作用是什么。

假设某个 Fiber 节点既需要更新，又需要删除子节点，则其 flags 会进行如下运算

```
// 0b0000000000000000000000000010100
fiber.flags = Update | ChildDeletion;

// 0b0000000000000000000000000000100 | 0b0000000000000000000000000010000 = 0b0000000000000000000000000010100
```

### subtreeFlags

子树中的副作用标记，记录子孙节点中是否有副作用，如有，则当前节点的 subtreeFlags 就不为 0。

在 Commit 阶段，React 需要遍历 Fiber 树，找出哪些节点有副作用（flags ≠ 0）并执行它们。但如果某个节点的 subtreeFlags === 0，说明它的整个子树都没有副作用，React 就可以跳过遍历它的所有子孙节点，直接“剪枝优化”，节省大量无意义的遍历开销。

### deletions

保存当前 Fiber 节点的直接子节点中需要被删除的节点。

在协调过程中，被删除的节点就会从 Fiber 树中移除，无法通过 Fiber 树寻找到。
但 Commit 阶段仍需要找到它们并执行清理操作（如从 DOM 移除、执行生命周期钩子 /hooks）。
所以需要使用 deletions 属性保存这些节点。

## 双缓冲机制相关属性

Fiber 架构使用双缓存机制优化页面的渲染过程，即在内存中维护两颗 Fiber 树（current fiber tree 和 workInProgress fiber tree），以便在内存中计算下次更新所需要进行的修改，并一次性提交到真实 DOM 上，优化渲染性能。

> current fiber tree：当前页面所对应的虚拟 DOM 树\
> workInprogress fiber tree：下次要渲染的页面所对应的虚拟 DOM 树

### alternate

指向另一个树中对应的 Fiber 节点
即 current fiber tree 和 workInProgress fiber tree 的互相引用，实现 fiber tree 的快速切换。

```
fiber.alternate.alternate === fiber // true
```

## 优先级相关属性

在 React 中，不同事件所触发的页面更新任务拥有不同的优先级，React 根据不同任务的优先级调度它们所执行的时机，优化用户体验。

### lanes

表示该 Fiber 任务的优先级。值越小，代表优先级越高。
此属性的值和 flags 一样，也是二进制数字。

```javascript
export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

export const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
export const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

export const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
```

### childLanes

记录了当前 Fiber 节点的子树中存在的所有更新优先级（lanes）

在 Render 阶段，React 会通过检查 childLanes 属性来判断子树中是否有更新，如果没有更新，则跳过子树的遍历。

# 总结

本文介绍了 React16 之前的 stack reconciler 是采用递归的方式去遍历组件树，且此过程不可中断，无法及时响应如用户交互等优先级高的任务，容易造成应用卡顿的体验。

为此 React16 重构了 reconciler 的处理逻辑，以便 React 应用在进行任务处理时，能实现中断并及时处理优先级较高的任务。

为了实现上述目标，采用了 Fiber 架构，从数据结构层面上为可中断遍历提供支持。
