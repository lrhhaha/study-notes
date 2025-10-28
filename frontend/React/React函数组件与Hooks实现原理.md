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

从上述useState和useEffect的例子可见，一般情况下，一个Hook函数被调用时，不会立即执行对应Hook的“本体”，而是先通过ReactCurrentDispatcher.current获取到当前组件所需的Hooks集合（HooksDispatcherOnMount 或 HooksDispatcherOnUpdate），然后从中取出真正的“本体”执行。

而上述useState和useEffect中的resolveDispatcher函数，本质就是返回ReactCurrentDispatcher.current的指向，源码如下所示：
```javascript
function resolveDispatcher() {
  const dispatcher = ReactCurrentDispatcher.current
  return dispatcher
}
```

画图！！！！
useState -> 调用resolveDispatcher，获取ReactCurrentDispatcher.current -> 指向 HooksDispatcherOnMount 或 HooksDispatcherOnUpdate -> 从中取出Hook本体

