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
