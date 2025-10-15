

React早期就有了无状态函数组件（Stateless Functional Components，简称 SFC）的概念。这类组件是用普通 JavaScript 函数编写的，只接收 props 并返回 JSX，不具备状态（state）和生命周期方法。


```javascript
// React 16.8 之前的函数组件（无状态）
function Welcome(props) {
  return <h1>Hello, {props.name}!</h1>;
}
```