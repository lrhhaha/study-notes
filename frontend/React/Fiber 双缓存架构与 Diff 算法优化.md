可中断的原理：任务切片 + 优先级 + 调度器？

双缓存树 + diff 算法：优化了协调过程，使得协调过程更加高效。（至于是否中断和恢复，应该是由调度器控制的？）



一、双缓存架构介绍

React维护了两棵Fiber树（即虚拟 DOM 树）：`current`树和`workInProgress`树。`current`树代表当前屏幕上显示的内容，`workInProgress`树代表正在构建的新内容。



双缓存架构的优点：



当我们用 canvas 绘制动画时，每一帧绘制前都会调用 ctx.clearRect 清除上一帧的画面，如果当前帧画面计算量比较大，导致清除上一帧画面到绘制当前帧画面之间有较长间隙，就会出现白屏。

为了解决这个问题，我们可以在内存中绘制当前帧动画，绘制完毕后直接用当前帧替换上一帧画面，由于省去了两帧替换间的计算时间，不会出现从白屏到出现画面的闪烁情况。







二、生成 workInProgress 树的过程

render 阶段的主要任务：高效生成 workInProgress 树



将当前fiber节点传入调用performUnitOfWork(fiber)，并返回下一个需要执行的fiber 节点。



整个performUnitOfWork 分为两个递和归两个阶段，分别执行beginWork 和 completeWork 方法。

两个方法的主要任务为：

+ beginWork：
+ completeWork：



beginWork 中，使用reconcileChildFibers 去生成直接子节点。而这个过程，则需要调用 diff 算法去优化 workInProgress 树的生成过程。reconcileChildFibers返回nextFiber（作为beginWork的返回值及下次performUnitOfWork的参数）

> Diff 算法的输入 = current Fiber 节点 + 新的 React 元素（JSX 编译后的 JS 对象）
>
> workInProgress 树 = Diff 算法的输出，不是输入！ 
>

在开始协调生成 workInProgress 树的开始，workInProgress 会复制得到 current 树的副本，然后 current 树和新的 React 元素进行 diff 对比，在此过程中对 workInProgress 树进行修改。



completeWork 中，





## diff 算法详解
### 组件复用判断条件
为了降低算法复杂度，React会预设三个限制:

1. 同层对比：只在同一层级的节点之间进行 diff 对比。
2. 类型不同的元素产生不同的树：如元素从 `<div>`变为 `<p>`，因为类型改变，默认不能复用旧 DOM 节点，直接删除旧 `<div>`节点及其子孙节点，并新建 `<p>`节点及其子孙节点。
3. 使用 key 属性作为元素的 `唯一标识`：key 值相同的两个节点会被视为同一个节点而进行精确匹配对比。

> 在列表渲染的情况下，React 会提示必须为每一项设置 key 作为唯一标识，以便在重新渲染时能精确匹配进行对比。
>
> 而在非列表渲染的情况下，React 则没有要求必须为元素设置 key 值。但在必要的情况下，也可以使用 key 值作为优化手段。（在没有设置 key 值的时候，将会简单地使用 `旧的第 n 项`VS`新的第 n 项`的规则。）
>



```tsx
<div>
  {isSwapped ? (
  <>
    <h3 key="aa">this is title</h3>
    <p key="bb">this is content</p>
  </>
) : (
  <>
    <p key="bb">this is content</p>
    <h3 key="aa">this is title</h3>
  </>
)}
  <button onClick={() => setIsSwapped(!isSwapped)}>
    切换顺序
  </button>
</div>
```

## diff 入口
diff 的入口函数是reconcileChildFibers。

其中需要关注的参数为：

+ currentFirstChild：current 树中将要进行对比的子节点（们）的第一个子节点（其余通过其 sibling 节点访问）
+ newChild：新渲染的 React 元素的子节点（们）

因为对于不同类型的 newChild 会有不同的处理函数，所以需要先判断其类型，常见类型为 Object 和 Array（分别代表单个子节点和多个子节点），还有如 number 和 string 等（本文暂不讨论）。

```typescript
function reconcileChildFibers(
  returnFiber: Fiber, 
  currentFirstChild: Fiber | null, // current节点的子节点
  newChild: any, // 将要渲染的children节点
  lanes: Lanes,
){
  // 如下为伪代码：
  
  if(isObject(newChild)) {
    reconcileSingleElement()
  }

  if(isArray(newChild)) {
    reconcileChildrenArray()
  }

  // 省略其他情况
  
}
```

接下来我们我讨论 newChild 为单节点和多节点的情况。

### 单节点 diff
当newChild为单节点的时候，

1. 展示宏观过程
2. 展示如果判断节点是否可以复用

有key值，则优先对比key值。
key值匹配成功，则证明此旧节点就是目标节点。
再对比元素类型，类型相等则可复用旧点解。如元素类型不相等，则证明旧节点不能复用，直接标记删除所有旧节点。
如key值匹配不成功，则标记此旧节点需要删除（而不删除它的兄弟节点，因为其他兄弟节点的key值可能会匹配成功），继续使用下一个兄弟节点进行对比，直至对比完所有旧节点。


![单节点diff历程](../assets/images/单节点有key值的diff流程.png)







### 多节点 diff
















