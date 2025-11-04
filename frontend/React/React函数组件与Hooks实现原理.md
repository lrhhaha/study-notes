# 前言

我们在编写 React 应用的时候，会使用函数组件配合 Hooks 实现状态管理及其他能力，这一切都是那么的顺理成章，然而大家是否有深究过为何函数组件需要使用各种 Hooks 来实现其他能力，以及 Hooks 的本质究竟是什么？为什么它们的使用需要严格按照规范，这背后的原理究竟是什么？

本文将针对上述问题展开探讨，分析 Hooks 的本质，以及它们如何与函数组件进行结合，从而辅助函数组件实现各种功能的。

# Hooks 的前世今生

## React16.8 前的组件

在 React16.8 版本之前，React 有两种类型的组件，分别是`类组件`和`函数式组件`。

它们根本上的区别是，类组件有状态管理、生命周期、副作用等 React 能力，而函数组件则没有。

函数组件用普通的 JS 函数编写，只接收 props 并返回 JSX，不具备状态管理等 React 能力，所以也称为无状态函数组件（Stateless Functional Components）。

```javascript
// helloworld.js
export default (props) => (
  <div>
    <p>{props.greeting}</p>
  </div>
);

// Example use
<HelloWorld greeting="Hello World!" />;
```

所以在 React16.8 版本之前，大部分 React 组件都需要使用类组件来编写，而函数组件只能参与小部分的纯 UI 编写。

## 类组件的不足之处

https://zh-hans.legacy.reactjs.org/docs/hooks-intro.html#motivation

但是承担着主要作用的类组件，却存在三个不足之处：

### 组件间难以复用状态逻辑

类组件中没有实现逻辑复用的原生方案，如果需要在多个组件中复用逻辑，只能通过 HOC（高阶组件）或 Render Props 辅助，不但代码实现麻烦，多层嵌套后还会形成“嵌套地狱”的问题。

### 逻辑分散，复杂组件变得难以理解

在某些业务场景中，我们可能需要监听某个变量改变从而执行后续操作，或需要在组件挂载/卸载时执行某些操作。在类组件中，我们需要借助 componentDidUpdate、componentWillUnmount 等生命周期钩子辅助完成。

其中的问题是，我有一个业务 A，需要使用到上述两个钩子，那么对应的逻辑则需要分别放在它们的回调函数中，造成一个业务的逻辑（在代码中）分散在两个地方，且会与其他业务的代码混杂在一起，使得代码难以阅读和理解。

### class 语义复杂

类组件使用 JS 原生的 class 语法进行编写，然而使用 class 语法就必须先理解 JS 中的 this 的工作原理，在事件处理函数绑定的时候，需要绑定当前的 this 值。这些复杂的原理和繁杂的使用方式，使类组件难以上手及增加平时使用的负担。

## Hooks 与函数组件

### Hoosk 的目的

出于对上述类组件的三个不足及 React 长期发展的考虑，React 团队希望推出一种新特性，与无状态函数组件（Stateless Functional Components）配合使用，使其拥有类组件所拥有的能力（即保持状态、处理副作用等 React 特性）。使得`无状态函数组件 + Hooks == 类组件`，从而实现抛弃类组件也能编写 React 应用。

### Hooks 的本质

> Hook 是 React 16.8 的新增特性。它可以让你在不编写 class 的情况下使用 state 以及其他的 React 特性。

如上片段是[React 官方文档](https://zh-hans.legacy.reactjs.org/docs/hooks-intro.html)对 Hooks 的总结性描述。

Hooks 的本质是普通的 JS 函数，它只能在函数组件或另一个 Hook 中调用，而不能在类组件中使用。

且在使用各种 Hooks 的时候，必须遵守如下规则：`Hooks只能在函数组件或自定义Hook的最顶层调用`，即不能在条件语句、循环语句或其他嵌套函数内调用 Hook，必须保障`函数组件每次调用时，各个Hooks的调用顺序一致`。

接下来本文将会围绕以下三点展开：

1. Hooks 的来源（针对不同时机调用不同版本的 Hooks）
2. Hooks 是如何被存储的（为什么需要保持调用顺序一致）
3. 以 useState 和 useEffect 为例，展示 Hooks 的执行流程。

# Hooks 的来源

React 组件被调用时，会处于以下两个阶段中的一个：

- mount 阶段（组件初次挂载时）
- update 阶段（已经挂载过的组件更新时）

而处于不同阶段的组件，所引用的 Hooks 其实是不一样的。

如下代码所示，Count 组件第一次挂载时和后续更新时，所引用执行的 useState 函数是不一样的（即使它们都叫做 useState），useEffect 同理。

```javascript
import { useState, useEffect } from "react";

function Count() {
  // 不同阶段所引用的 useState 函数是不一样的
  const [count, setCount] = useState(0);

  // useEffect 同理
  useEffect(() => {
    console.log(`count：${count}`);
  }, [count]);

  return (
    <div>
      <p>{count}</p>
    </div>
  );
}

export default Count;
```

每个 Hook 都会有两套版本，即 mount 版本和 update 版本，分别存放在 HooksDispatcherOnMount 对象和 HooksDispatcherOnUpdate 对象中。

```javascript
// 存放所有mount时期需要执行的Hooks
const HooksDispatcherOnMount = {
  // ... some code .. 其他hooks基本同理

  // mount时期需要执行的useEffect
  useEffect: mountEffect,
  useRef: mountRef,
  useState: mountState,

  // ... some code ...
};

// 存放所有update时期需要执行的Hooks
const HooksDispatcherOnUpdate: Dispatcher = {
  // ... some code .. 其他hooks基本同理

  useEffect: updateEffect,
  useRef: updateRef,
  useState: updateState,

  // ... some code ...
};
```

而 React 组件是如何知道在当前阶段应该从哪个对象中取出所需的 Hooks 呢？答案就是 ReactCurrentDispatcher ，现在我们可以将其理解为一个“Hooks 调度器”，他的 current 属性会指向组件当前阶段所对应的 Hooks 集合（即上述的 HooksDispatcherOnMount 或 HooksDispatcherOnUpdate）

```javascript
const ReactCurrentDispatcher = {
  // 此current属性将会动态指向 HooksDispatcherOnMount 或 HooksDispatcherOnUpdate
  current: null,
};
```

当 ReactCurrentDispatcher 的 current 通过某种方式（下文将会提到）指向了某个 Hooks 集合之后，各个 Hooks 在执行时就会从所指的集合中取出对应 Hook。以 useState 和 useEffect 为例，它们的源码分别如下所示：

```javascript
export function useState(initialState) {
  // 获取ReactCurrentDispatcher.current的指向
  const dispatcher = resolveDispatcher();
  // 从正确的Hooks集合中取出对应的Hook
  return dispatcher.useState(initialState);
}

export function useEffect(create, deps): void {
  // 获取ReactCurrentDispatcher.current的指向
  const dispatcher = resolveDispatcher();
  // 从正确的Hooks集合中取出对应的Hook
  return dispatcher.useEffect(create, deps);
}
```

从上述 useState 和 useEffect 的例子可见，一般情况下，一个 Hook 函数被调用时，不会立即执行对应 Hook 的“本体”，而是先通过 ReactCurrentDispatcher.current 获取到当前组件所需的 Hooks 集合（HooksDispatcherOnMount 或 HooksDispatcherOnUpdate），然后从中取出真正的“本体”执行。

而上述 useState 和 useEffect 中的 resolveDispatcher 函数，本质就是返回 ReactCurrentDispatcher.current 的指向，源码如下所示：

```javascript
function resolveDispatcher() {
  const dispatcher = ReactCurrentDispatcher.current;
  return dispatcher;
}
```

如下图展示了 ReactCurrentDispatcher.current 的赋值及 Hooks 提取并执行的过程
![hooks来源](../assets/images/React/hooks/hooks来源.png)

## ReactCurrentDispatcher.current 的指向

现在我们知道了 ReactCurrentDispatcher.current 会根据当前被调用的组件所处的阶段，指向 HooksDispatcherOnMount 或 HooksDispatcherOnUpdate 对象。接下来我们将探讨 ReactCurrentDispatcher.current 是如何指向正确的 Hooks 集合的。

在开始之前，我们需要知道在 React 的双缓存架构中，维护着 current fiber tree 和 workInProgress fiber tree 这两颗树，它们分别代表当前页面的 fiber 节点所组成的树，和下一个页面的 fiber 节点所组成的树。

而对于某个组件而言，当它在初始化挂载的时候，是没有对应的 current fiber 节点的，只有当挂载完毕之后，才会将 workInprogress fiber 节点赋值给 current fiber 节点。所以 React 判断当前组件是否是处于初始化挂载阶段，采用的是`判断其 current fiber 节点是否为空`，反之则为更新阶段。

除了上述判断条件之外，我们还需引入另一个条件进行辅助判断：当前组件是否已经初始化过 Hooks。代码中的体现为判断 current.memoizedState 属性是否为空，此属性用于当前组件存储自身所有的 Hooks（以链表的方式存储，本文后续将会提到）。使用 memoizedState 进行辅助判断的原因是 React 的渲染过程是可以中断的，可能出现的一种情况为，已经为当前组件创建了 fiber 节点但没有提交，此时渲染中断，等到后续重新渲染的时候，可以复用之前的 fiber 节点，但是其 Hooks 是没有初始化，即 memoizedState 属性为空。

归纳一下，ReactCurrentDispatcher.current 只有如下两种情况会指向 HooksDispatcherOnMount，其余情况都指向 HooksDispatcherOnUpdate：

1. 当前组件 fiber 节点没有初始化过
2. 当前组件 fiber 节点的 memoizedState 属性为空（即 Hooks 链表为空）

节选代码如下所示：

```javascript
export function renderWithHooks(
  current, // current Fiber
  workInProgress, // workInProgress Fiber
  Component // 函数组件本身
  // ... 其他形参 ...
) {
  // ... some code ...

  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null // current.memoizedState === null 代表当前组件没有使用过任何Hooks，需要使用HooksDispatcherOnMount中的Hooks进行初始化
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;

  // ... some code ...
}
```

# Hook 的数据结构及储存方式

接下来我们聊一下 Hooks 执行之后，会生成什么样的数据结构进行存储。
在源码中，我们可以看到执行之后的 Hook 会以对象的形式存储，而每个 Hook 对象拥有如下 5 个属性：

```typescript
export type Hook = {
  memoizedState: any;
  baseState: any;
  baseQueue: Update<any, any> | null;
  queue: any;
  next: Hook | null;
};
```

- memoizedState： 保存当前 Hook 的状态值，不同类型的 Hook 保存不同的信息。（如 useState 中 保存 state 信息、useEffect 中 保存着 effect 对象、useRef 中保存的是 ref 对象）。
- baseState：保存在上一次 render 中未被跳过的 state 基准值（主要用于 useState 和 useReducer 的批量更新或中断更新场景。如：在并发模式（Concurrent Mode）下，如果某个更新被中断或跳过，React 需要一个“基础状态”来重新计算后续更新。baseState 就是这个起点。）
- baseQueue：保存那些尚未被处理（或被跳过）的更新队列。（低优先级更新被高优先级更新打断后，这些被挂起的更新会被暂存在 baseQueue 中，等到合适的时机再重新应用。）
- queue：(一般只在 useState 和 useReducer 中发挥作用)以循环链表的方式储存当前 Hook 的更新对象
- next：指向当前组件的下一个 Hook 对象的引用。

当我们大概了解 Hook 的结构后，再聊聊它们是如何与对应的组件进行绑定及存储的。
函数组件不像类组件那样有自己的实例，它们是以 fiber 节点的形式存在的。其中 Fiber 对象中有一个关键的`memoizedState`属性，此属性储存当前函数组件所有 Hook 对象所组成的链表（在类组件中，此属性储存的则是当前组件的状态）。
当我们在一个组件中调用多个 Hooks 时，React 会为每个 Hook 创建一个对象，并按顺序挂载到 fiber.memoizedState 中：

```
fiber.memoizedState
  ↓
Hook1 (useState)
  ↓
Hook2 (useEffect)
  ↓
Hook3 (useRef)
```

在函数组件重新执行的时候，就会顺着这条链表去“对号入座”，为每个 Hook 匹配正确的 Hook 对象。

> 第一个 Hook → 第一个 Hook 节点
> 第二个 Hook → 第二个 Hook 节点
> ...以此类推。

这也可以解释，为什么 Hooks 必须在组件的顶层使用，而不能在条件分支中调用。因为如何每次组件重新执行时，Hooks 的数量不一致，那么 fiber.memoizedState 的链表就会错乱，无法正确匹配。

# 梳理执行流程：从函数组件的执行说起

## 函数组件执行

接下来我们将从函数组件的执行出发，梳理 Hooks 是如何被创建及发挥其作用的。

函数组件的本质就是一个 JS 函数，那么它们是如何被调用的呢？

答案就是上一节所提到的`renderWithHooks`函数，此函数会接收如下几个参数：

```javascript
renderWithHooks(
  current, // current Fiber
  workInProgress, // workInProgress Fiber
  Component, // 函数组件本身
  props, // props
  context, // 上下文
  renderExpirationTime // 渲染 ExpirationTime
);
```

其中第三个参数`Component`就是函数组件本身（即一个 JS 函数），将会在上述 renderWithHook 函数中被调用。

整体宏观流程如下图所示：
![函数组件执行与hooks执行](../assets/images/React/hooks/函数组件执行与Hooks执行.png)

整个流程可分为三个步骤：

1. 首先根据传入的 current 判断当前组件是否是初次渲染，从而决定 ReactCurrentDispatcher.current 的指向。
2. 执行 Component 函数，执行函数组件，遇到 Hooks 时从 ReactCurrentDispatcher.current 获取并执行
3. 将 ReactCurrentDispatcher.current 赋值为 ContextOnlyDispatcher

接下来我们将从上述三点展开阐述

第一点中对 ReactCurrentDispatcher.current 的赋值相信大家通过前文已经有所了解，就是通过 current 参数判断当前组件是否是第一次挂载，从而决定指向 HooksDispatcherOnMount 还是 HooksDispatcherOnUpdate。

第二点主要阐述各个 Hooks 是如何运行的，虽然各个 Hooks 的具体逻辑有所不同，但大致过程是相同的。这一点会在下文详细展开。

第三点中提到当 Component 执行完毕之后，会将 ReactCurrentDispatcher.current 指向 ContextOnlyDispatcher 对象。/
此对象就是类似 HooksDispatcherOnMount 和 HooksDispatcherOnUpdate 的 Hooks 集合，只不过里面的 hooks 大都指向同一个 throwInvalidHookError 函数。

```javascript
export const ContextOnlyDispatcher: Dispatcher = {
  // ... some code ...
  useEffect: throwInvalidHookError,
  useState: throwInvalidHookError,
  // ... some code ...
};
```

throwInvalidHookError 函数如下所示，执行时会抛出错误，以提示“hooks 只能在函数组件内部使用”。/
其作用是确保 hooks 只能在函数内部被调用，否则就会抛出错误。回看上面的图片会发现，当函数组件将要被调用时，会经历三个阶段`赋值ReactCurrentDispatcher.current -> 执行Component函数 -> 赋值ReactCurrentDispatcher.current`，即 ReactCurrentDispatcher.current 只有在函数组件被执行的期间才会正确指向 HooksDispatcherOnMount 或 HooksDispatcherOnUpdate，其他时间都会指向 ContextOnlyDispatcher。如果在函数组件之外调用 hooks 那么就会报错。

## Hooks 执行

接下来我们将展开当函数组件遇到 Hooks 时是如何执行的。我们会使用 useState 和 useEffect 进行举例说明。

组件第一次渲染时，useState 的“本体”是 mountState 函数，代码如下所示

```javascript
function mountState(initialState) {
  // 为当前Hook创建Hook对象
  const hook = mountWorkInProgressHook();

  // 当useState的参数为函数时，执行它并将返回值作为state的值
  if (typeof initialState === "function") {
    initialState = initialState();
  }

  // 将初始state的值分别挂载到hook对象的baseState和memoizedState属性上
  hook.memoizedState = hook.baseState = initialState;

  // 初始化hook对象的queue属性，方便后续在其上面挂载update对象
  const queue = (hook.queue = {
    pending: null, // 带更新的
    dispatch: null, // 负责更新函数
    lastRenderedReducer: basicStateReducer, //用于得到最新的 state ,
    lastRenderedState: initialState, // 最后一次得到的 state
  });

  // 创建setXXX函数，为其绑定当前Fiber节点及update对象链表
  const dispatch = (queue.dispatch = dispatchAction.bind(
    // 负责更新的函数
    null,
    currentlyRenderingFiber,
    queue
  ));
  return [hook.memoizedState, dispatch];
}
```

上述操作我们可以简单归纳为四个步骤：

1. 创建 hook 对象
2. 计算初始 state 并挂载保存
3. 初始化 hook.queue 属性
4. 创建 setXXX 函数，为其绑定当前 fiber 节点与 update 链表 queue

其中第二三点

dispatchAction 其实就是 useState 返回的数组的第二个元素。
它的作用主要是创建 update 对象，并将 update 对象挂载到对应 hook.queue 上。
至于它是如何知道要挂载到哪个 hook 的 queue 上的，答案就在于其参数上。

```javascript
function dispatchAction(fiber, queue, action) {}
```

如上源码所示，dispatchAction 实际上需要接收三个参数，而我们平时调用 setXXX 函数时，只需传入具体的值或一个回调函数。此时我们传入的其实是第三个参数，前两个参数会在 useState 执行时，使用 bind 帮我们绑定，把对应的 fiber 节点和 hook.queue 绑定。
这样就能确保调用 setXX 函数时，如何正确更新对应的 state 了。
