# 大纲
主题是用generator实现async/await原理。

那async/await的是什么？它的原理是什么？

## 出现顺序
ES6 (ECMAScript 2015)：
1. Iterator（迭代器协议）
2. Generator 基于 Iterator
3. Promise 独立发展

ES8 (ECMAScript 2017)：
1. async/await


## 理解
所以可以理解为，async/await的出现是一个“以外之喜”！
即原本iterator是作为迭代器协议出现的，而generator是为了更方便地生成iterator对象。
而promise原本和iterator，generator是毫无关系的，它只是一个异步操作的解决方案。

然后后续有开发人员发现了generator + promise可以实现类同步代码的异步操作，所以手写了”执行器函数“来实现。（co.js库）
然后ECMA官方人员也注意到了这个事情，所以推出了async/await来简化generator + promise的使用。

## 想法
配合babel查看转义后的代码？

# 正文



# 前世今生
在ECMAScript 2015（即ES6）中，推出了三个语法：Iterator、Generator、Promise。

首先简短地总结它们推出的意义：
- Iterator：为各种不同的数据结构提供统一的访问机制。
- Generator：简化 Iterator 对象的编写。
- Promise: 异步操作解决方案（与Iterator及Generator不存在直接关系）。

后续有开发人员发现了 Generator + Promise 可以实现类似同步代码的异步操作的实现，只不过需要手写"执行器"去辅助完成。于是








```javascript
function myAsyncAwait(generator) {
  const iterator = generator();
  let item = iterator.next();
  worker(item);

  function worker(obj) {
    if (obj.done) {
      // 在此处返回一个promise？
      return;
    }

    // 如果obj.value本来就是promise，那么直接返回它，否则创建一个promise，并以obj.value兑现
    const p = Promise.resolve(obj.value);

    p.then((res) => {
      obj = iterator.next(res);
      worker(obj);
    }).catch((err) => {
      // 其实throw等于执行了next并抛出了错误？（甚至可以理解为“使用next返回了一个错误”）
      obj = iterator.throw(new Error(err));
      worker(obj);
    });
  }
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

function* test2() {
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
}

console.log("start");
myAsyncAwait(test2); // test2()
console.log("end");
```
