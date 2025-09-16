# React 架构设计：从 Monolithic 到 Fiber 的演进

## 前言

本文后续遵循以下约定：

1. React 应用 UI 更新过程从宏观上拆分为 render 阶段和 commit 阶段。
2. render 阶段主要负责计算新的 DOM 内容，并计算如何以最小代价更新真实 DOM。
3. commit 阶段主要负责将 render 阶段计算好的更新内容提交到真实 DOM 上。
4. render 阶段的核心称为 Reconciler（协调器）
5. commit 阶段的核心称为 Renderer（渲染器）

## stack reconciler 与 fiber reconciler 的前世今生

在 React16 之前，当应用状态发生改变，宏观上会执行以下两部分的工作，以更新 UI：

1. Reconciler（协调器）会生成新的虚拟 DOM，并与旧的虚拟 DOM 进行对比，找出需要更新的部分。
2. Renderer（渲染器）根据 Reconciler 计算的结果，将需要更新的部分提交到真实 DOM 上。

Reconciler 的整个工作过程（从生成虚拟 DOM 到计算得出更新部分）是一个`不可中断的递归`过程（即 stack reconciler），而 JS 作为单线程语言，在此过程中不能处理其他任务（如响应用户的输入操作等）。这就造成了应用交互卡顿的风险。

为此 React 团队计划在 React16 中重构 Reconciler 的逻辑，以实现应用在 Reconciler 工作时能`中断任务并优先处理优化级较高的任务`如用户交互操作。并将这个新的方式称为为 Fiber Reconciler。（而 Renderer 的工作逻辑不变，其执行过程仍然是不可中断的）。

上述即是从 stack reconciler 向 fiber reconciler 转变的原因及目的。

为了实现不可中断的递归更新重构为可中断的遍历更新，之前所使用的虚拟 DOM 树的元素数据结构已无法满足需求，Fiber 架构应运而生。

简而言之：Fiber 架构不是让渲染变快，而是让`关键任务永不等待`。

### fiber 架构

Fiber 包含三层含义：

1. 作为数据结构来说，一个 fiber 节点对应一个 React 元素（React 组件、原生标签等），保存了该元素的所有信息，作为虚拟 DOM 的节点使用。而 fiber 节点组成的树状结构就是 Fiber 架构下虚拟 DOM 的实现方式。

2. 作为架构来说，Reconciler 的生成虚拟 DOM 的过程是基于 fiber 节点实现的可中断遍历，此过程可称为 Fiber Reconciler。

3. 作为工作单元来说，一个Fiber节点代表一个工作单元，保存了本次更新中该组件改变的状态、要执行的工作（需要被删除/被插入页面中/被更新...）。


fiber节点与结构相关的属性有如下三个：
- child: 指向子Fiber节点
- sibling：指向右侧第一个兄弟Fiber节点
- return：指向父级Fiber节点

``` JSX
<App>
  <Header />
  <Main>
    <Component1 />
    <Component2 />
  </Main>
</APP>
```

其fiber树结构如图所示

![fiber链式树状结构](../assets/images/fiber链式树状结构.png)

> fiber树的链式树状结构的遍历特点为：
> 1. 深度优先遍历
> 2. 处理当前节点，然后寻找下一个需要处理的节点
> 3. 下一个节点的寻找逻辑为：child节点 -> sibling节点 -> return节点

每个Fiber节点都保存了从哪里来，该往哪里去的信息（即使在某个节点处中断任务，后续仍可恢复遍历），这让可中断遍历提供了结构上的支持。



总结一下，为了实现 render 阶段可中断，fiber 架构做出了如下重大改变：

1. 将 stack reconciler 中一整个渲染任务拆分为多个任务（即多个fiber节点，每个节点可代表一个工作单元）
2. 重构了虚拟 DOM，以 fiber 树作为虚拟 DOM 的载体。
3. 对虚拟 DOM 树进行重构，从普通树状结构重构为链式树状结构。

## fiber 节点属性介绍
接下来介绍fiber节点所具有的属性，及其作用。

### 标识和类型属性

- key：React元素的key属性，用于优化列表对比过程
- tag：即当前元素的`WorkTag`类型（用数字飙屎节点类型）
- elementType：创建Fiber时传入的“原始”组件类型
- type：实际用于渲染的组件的类型

其中elementType和type属性比较容易混淆，列举如下三个例子帮助理解：
1）对于原生元素而言，两者相同，就是标签名称
```
<div>Hello</div>
// elementType → 'div'
// type → 'div'
```

2）对于普通组件而言，两者相同，指向组件本身
```
function MyComponent() { return <div>Hello</div>; }
// elementType → MyComponent（函数）
// type → MyComponent（函数）
```

3）对于高阶组件返回的组件而言，两者有明显区别\
可理解为 type 是解包之后的组件（elementType.type === type）
```
const Comp = React.memo(MyComponent);
// elementType → Memo 对象 { type: MyComponent, ... }
// type → MyComponent（函数本身）
```

### 树状结构相关属性

Fiber 节点通过以下三个属性形成链式树状结构：
- return：指向父 Fiber 节点
- child：指向第一个子 Fiber 节点
- sibling：指向下一个兄弟 Fiber 节点

### 状态相关属性
1）memoizedProps
上一次渲染时使用的 props

2）memoizedState: 
上一次渲染时使用的 state

3）pendingProps: 
新的待处理的 props
 
4）updateQueue: 
存储更新对象的队列

### 副作用相关属性
1）flags
标记该 Fiber 节点在 commit 阶段需要执行的副作用（如插入、更新、删除等），可能存在多个副作用。

在React中，使用二进制数字代表不同的副作用，并使用`与运算`的结果记录所有副作用。

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
观察可知，每个二进制数字代表一种副作用，且最小单位的副作用的二进制数字中只包含一个1。如果某个fiber节点需要执行两个副作用，则可使用它们对应的二进制数字进行与运算，得出拥有两个1的二进制数字，即可反推出这两个副作用是什么。

假设某个fiber节点既需要更新，又需要删除子节点，则其flags会进行如下运算
```
// 0b0000000000000000000000000010100
fiber.flags = Update | ChildDeletion;

// 0b0000000000000000000000000000100 | 0b0000000000000000000000000010000 = 0b0000000000000000000000000010100
```

2）subtreeFlags
子树中的副作用标记
记录子孙节点中是否有副作用，如有，则当前节点的subtreeFlags就不为0。

在 commit 阶段，React 需要遍历 Fiber 树，找出哪些节点有副作用（flags ≠ 0）并执行它们。但如果某个节点的 subtreeFlags === 0，说明它的整个子树都没有副作用，React 就可以跳过遍历它的所有子孙节点，直接“剪枝优化”，节省大量无意义的遍历开销。

3）deletions
保存当前fiber节点的直接子节点中需要被删除的节点。

在协调过程中，被删除的节点就会从 Fiber 树中移除，无法通过 fiber 树寻找到。
但 commit 阶段仍需要找到它们并执行清理操作（如从 DOM 移除、执行生命周期钩子 /hooks）。
所以需要使用 deletions 属性保存这些节点。

### 双缓冲机制相关属性
1）alternate
指向另一个树中对应的 Fiber 节点，
让 react 在 current fiber tree 和 work in progress fiber tree 中来回切换，实现任务中断和恢复。
```
fiber.alternate.alternate === fiber // true
```

### 优先级相关属性
1）lanes
表示该fiber任务的优先级。
todo：补充二进制

2）childLanes
子树中任务的优先级
todo：总得补个作用概述吧

## 从状态更新到页面渲染
接下来我们从宏观角度分析当某个组件的状态发生变化时，React是如何对UI进行更新的

