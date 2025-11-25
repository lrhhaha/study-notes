

# 前言

# 宏观过程
调用setState函数（尝试）更改状态

创建更新对象

调度渲染任务的执行

scheduler通过messageChannel发起任务调度

render阶段


commit阶段


# 过程拆分
## 从状态更新说起
React组件的重新，一般是由状态更新而引起的。
也就是由useState返回的setState函数的调用所引起的。

本小节将梳理setState函数被调用后发生了什么

setState函数在源码中的体现是dispatchSetState函数，其接收3个参数作为函数

然后在useState执行时，会使用bind函数提前绑定其前两个参数，然后将返回的新函数命名为setState，然后作为useState返回值的第二个元素。

所以平时我们在调用setState函数时，只需传入一个值（具体值或函数），作为dispatchSetState的第三个函数而执行。

dispatchSetState函数执行时，具体会执行以下几个步骤：
1. 进行Eager state优化：比较上次的值和本次修改的值，如两者相等则不触发后续的更新步骤。
2. 为本次更新创建update对象
3. 将update对象挂载到当前useState的hook对象的update链表上（以环形链表的方式存储）
4. 调用scheduleUpdateOnFiber函数，发起后续更新。
    1. 从出发更新的fiber节点往上寻找其所有直接父节点，并标记此路径上fiber节点的lanes和childLanes属性（以表示当前节点有更新操作或其子孙节点存放更新操作，为后续render节点的bailout优化做铺垫）
    2. 将root节点丢给scheduler发起一次任务调度

## scheduler任务调度
scheduler基于messageChannel发起任务的调度（messageChannel的通信是宏任务，浏览器通过事件循环机制调控）。

当进入任务执行阶段时，scheduler从任务池中（通过小顶堆）取出优先级最高的任务执行。

进入render/reconcile阶段。

此过程的目的是：生成workInProgress fiber tree

整个阶段可视为循环执行preformUnitOfwork的过程，每执行一次performUnitOfWork可视为执行一个工作单元，生成当前节点对应的workInProgress fiber 节点

上述“循环执行performUnitOfWork”的过程会有额外的判断条件，目的是防止循环过程长时间阻塞主线程，从而导致应用无法响应其他事件，造成卡顿。这部分文章后面会提到。

performUnitOfWork可视为两个阶段：
1. beginWork
2. completeWork

# 总结