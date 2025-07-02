# 大纲

主题是用 generator 实现 async/await 原理。

那 async/await 的是什么？它的原理是什么？

## 出现顺序

ES6 (ECMAScript 2015)：

1. Iterator（迭代器协议）
2. Generator 基于 Iterator
3. Promise 独立发展

ES8 (ECMAScript 2017)：

1. async/await

## 理解

所以可以理解为，async/await 的出现是一个“以外之喜”！
即原本 iterator 是作为迭代器协议出现的，而 generator 是为了更方便地生成 iterator 对象。
而 promise 原本和 iterator，generator 是毫无关系的，它只是一个异步操作的解决方案。

然后后续有开发人员发现了 generator + promise 可以实现类同步代码的异步操作，所以手写了”执行器函数“来实现。（co.js 库）
然后 ECMA 官方人员也注意到了这个事情，所以推出了 async/await 来简化 generator + promise 的使用。

## 想法

配合 babel 查看转义后的代码？

# 正文

相信大家平时在编写代码遇到异步操作时，都喜欢使用 Promise，而遇到多个异步任务按顺序执行时，还会使用 async/await 语法简易地实现，而不必“忍受” Promise 长长的链式调用。

那么 async/await 为何有那么大的能力能让我们的异步操作可以像同步代码一样书写呢？

本文将探究 async/await 的原理，并尝试手写实现 myAsyncAwait 函数。

# async/await 的前世今生

在 ECMAScript 2015（即 ES6）中，推出了三个语法：Iterator、Generator、Promise。

首先简短地总结它们推出的意义：

- Iterator：为各种不同的数据结构提供统一的访问机制。
- Generator：简化 Iterator 对象的编写。
- Promise: 异步操作解决方案（与 Iterator 及 Generator 不存在直接关系）。

后续有开发人员发现了 Generator + Promise 可以实现异步操作类似同步代码的书写方式，只不过需要手写"执行器"去辅助完成。[co.js](https://www.npmjs.com/package/co) 就是其中著名的代表。

后来这种 Generator + Promise 的异步流程控制方案得到了 ECMA 官方的认可，并着手指定一套名为 async/await 的语法，以简化传统 Generator + Promise 的实现方式，并将其"执行器"内置。

在 ECMAScript 2017（即 ES8）正式发布 async/await 语法。这才有了我们今天简易的 async/await 写法。

所以 async/await 是 Generator + Promise `异步流程控制方案`的简易实现，或者说是其语法糖。它并非是异步操作解决方案。

本文将尝试使用 Generator 和 Promise 等相关知识，编写一个函数，以实现类似 async/await 的异步操作类似同步代码的书写方式。

# 前置知识
正式开始编写我们的myAsyncAwait函数之前，我们需要了解Iterator和Generator的相关知识。

## Iterator
ES6中推出了for...of循环之后，我们可以使用其去遍历Array、Map、Set等数据结构，这些能使用for...of循环遍历的数据结构，我们称之为“可遍历的”。

其背后的奥秘就是，这些数据结构都能访问到Symbol.iterator属性，此属性是一个函数，执行之后会返回一个Iterator迭代器对象。而for...of循环正是通过消费Iterator迭代器对象来实现对某个数据结构的遍历操作（for...of循环不关心此刻遍历的数据结构是怎么样的，只关心其是否部署了Symbol.iterator属性）。



> MDN：Iterator 对象是一个符合迭代器协议的对象，其提供了 next() 方法用以返回迭代器结果对象。

即所谓的Iterator迭代器对象是一个拥有next()方法的对象，其next()方法执行后会返回拥有value和done属性的对象。每次调用其next()方法，都会返回一个拥有value和done属性的对象，直至其done属性值为true。如下图所示：













```javascript
function myAsyncAwait(generator) {
  return new Promise((resolve) => {
    // 1. 获取迭代器
    const iterator = generator();
    let res = iterator.next();

    worker(res);

    // worker函数接受next函数的返回值
    function worker(item) {
      if (item.done) {
        resolve(item.value);
        return;
      }

      // 如果obj.value本来就是promise，那么直接返回它，否则创建一个promise，并以obj.value兑现
      const p = Promise.resolve(item.value);
      let nextItem;
      p.then((res) => {
        nextItem = iterator.next(res);
        worker(nextItem);
      }).catch((err) => {
        // 其实throw等于执行了next并抛出了错误？（甚至可以理解为“使用next返回了一个错误”）
        nextItem = iterator.throw(new Error(err));
        worker(nextItem);
      });
    }
  });
}

let x = 1;
// 模拟网络请求
function queryData(bool = true) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (bool) {
        resolve(`data${x++}`);
      } else {
        x++;
        reject("something error");
      }
    }, 2000);
  });
}

function* test() {
  console.log("testtest");
  const res0 = yield "0";
  console.log(res0);

  console.log("请求1");
  const res1 = yield queryData();
  console.log("请求1结果：" + res1);

  console.log("请求2");
  try {
    const res2 = yield queryData(false);
    console.log("请求2结果：" + res2);
  } catch (err) {
    console.log("请求出错：" + err.message);
  }

  console.log("请求3");
  const res3 = yield queryData();
  console.log("请求3结果：" + res3);

  return "hahah";
}

console.log("start");
myAsyncAwait(test).then((res) => {
  console.log(res, "??");
});
console.log("end");
```
