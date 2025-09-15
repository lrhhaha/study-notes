# React 架构设计：从 Monolithic 到 Fiber 的演进

## 前言

本文后续遵循以下约定：
1. React应用UI更新过程从宏观上拆分为render阶段和commit阶段。
2. render阶段主要负责计算新的DOM内容，并计算如何以最小代价更新真实DOM。
3. commit阶段主要负责将render阶段计算好的更新内容提交到真实DOM上。
4. render阶段的核心称为Reconciler（协调器）
5. commit阶段的核心称为Renderer（渲染器）

## stack reconciler 与 fiber reconciler 的前世今生
在React16之前，当应用状态发生改变，宏观上会执行以下两部分的工作，以更新UI：
1. Reconciler（协调器）会生成新的虚拟DOM，并与旧的虚拟DOM进行对比，找出需要更新的部分。
2. Renderer（渲染器）根据Reconciler计算的结果，将需要更新的部分提交到真实DOM上。

Reconciler的整个工作过程（从生成虚拟DOM到计算得出更新部分）是一个`不可中断的递归`过程（即stack reconciler），而JS作为单线程语言，在此过程中不能处理其他任务（如响应用户的输入操作等）。这就造成了应用交互卡顿的风险。

为此React团队计划在React16中重构Reconciler的逻辑，以实现应用在Reconciler工作时能`中断任务并优先处理优化级较高的任务`如用户交互操作。并将这个新的架构命名为Fiber架构。（而Renderer的工作逻辑不变，其执行过程仍然是不可中断的）。


上述即是从stack reconciler向fiber reconciler转变的原因及目的。

简而言之：Fiber 架构不是让渲染变快，而是让`关键任务永不等待`。


为了实现render阶段可中断，fiber架构做出了如下重大改变：
1. 将stack reconciler中一整个渲染任务拆分为多个任务（一般以react组件或HTML元素作为工作单位）
2. 重构了虚拟DOM，以fiber元素作为虚拟DOM的载体。
3. 对虚拟DOM树进行重构，从普通树状结构重构为链式树状结构。









## fiber节点属性介绍


## 从状态更新到页面渲染