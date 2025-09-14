# React 架构设计：从 Monolithic 到 Fiber 的演进

## 前言

## stack reconciler 与 fiber reconciler 的前世今生
- 分析stack reconciler 的特点，及缺点
- react重构想要实现什么目标
- 如何支持react重构的目标？从`数据结构`和`调度系统`上分析
- 介绍miniFiber节点，fiber树，为什么能从数据结构上提供支持


> Fiber 不是让渲染变快，而是让关键任务永不等待。

## fiber节点属性介绍


## 从状态更新到页面渲染