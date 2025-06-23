
Generator函数：ES6（2015年）推出
async/await函数：ES2017（2017年）推出，是Generator函数的改进版本

Generator 函数是 ES6 提供的一种异步编程解决方案


async 函数是什么？一句话，它就是 Generator 函数的语法糖。



ES6 诞生以前，异步编程的方法，大概有下面四种。

回调函数
事件监听
发布/订阅
Promise 对象
Generator 函数将 JavaScript 异步编程带入了一个全新的阶段。

众所周知，Promise 是 JS 中异步编程的其中一种解决方案。
而在 ES2017 中推出了 async/await 语法，借助 async 函数，能让 Promise 的使用更加简洁。

而不知道大家是否了解过，其实 async 是 generator 函数的语法糖。

generator函数是JS的一种异步编程解决方案，它的地位和Promise一样，是“异步编程解决方案”。

而async函数严格来说它并不是“异步编程解决方案”，只是generator函数的语法糖，并且专注于简化Promise的使用。

所以我们是可以编写一个函数，使用generator模拟async函数的功能。

```javascript
function myAsyncAwait(generator) {
  const iterator = generator();
  let item = iterator.next();
  worker(item);

  function worker(obj) {
    if (obj.done) return;

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
