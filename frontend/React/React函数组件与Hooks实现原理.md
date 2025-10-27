# 前言

我们在编写 React 应用的时候，会使用函数组件配合 Hooks 实现状态管理及其他能力，这一切都是那么的顺理成章，然而大家是否有深究过为何函数组件需要使用各种 Hooks 来实现其他能力，以及 Hooks 的本质究竟是什么？为什么它们的使用需要严格按照规范，这背后的原理究竟是什么？

本文将针对上述问题展开探讨，分析 Hooks 的本质，以及它们如何与函数组件进行结合，从而辅助函数组件实现各种功能的。

# Hooks 的前世今生

## React16.8前的组件

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

所以在React16.8版本之前，大部分React组件都需要使用类组件来编写，而函数组件只能参与小部分的纯UI编写。

## 类组件的不足之处

https://zh-hans.legacy.reactjs.org/docs/hooks-intro.html#motivation

但是承担着主要作用的类组件，却存在三个不足之处：

### 组件间难以复用状态逻辑

### 逻辑分散，复杂组件变得难以理解

### class语义复杂

## 

Hooks 是 React16.8 版本引入的新特性，其本质是一个函数。


> Hook 是 React 16.8 的新增特性。它可以让你在不编写 class 的情况下使用 state 以及其他的 React 特性。
