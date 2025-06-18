function asyncAwait(generator) {
  const iterator = generator();
}

// 现在有一个promise1，等待其fulfilled后，执行promise2，

// function queryData1() {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve("p1 data");
//     }, 2000);
//   });
// }

// queryData1().then(res => {
//   console.log(res);
// })

function test() {
  console.log("start");
  const p1 = new Promise((resolve) => {
    setTimeout(() => {
      resolve("p1 data");
    }, 2000);
  });

  p1.then((res) => {
    console.log(res);
  });

  console.log("end");
}

// test()
let x = 1;
function queryData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`data${x++}`);
    }, 2000);
  });
}

async function test1() {
  console.log("start");
  const p1 = new Promise((resolve) => {
    setTimeout(() => {
      resolve("p1 data");
    }, 2000);
  });

  const res = await p1;

  console.log(res);
}

// test1()
// console.log('??');







function* test2() {
  console.log("我就不用promise，看你能不能处理");
  const res0 = yield "0";
  console.log(res0);

  console.log("请求1");
  const res1 = yield queryData();
  console.log(res1);

  console.log("请求2");
  const res2 = yield queryData();
  console.log(res2);
}

function myAsyncAwait(generator) {
  const iterator = generator();

  let item = iterator.next();
  worker(item);

  function worker(obj) {
    if (obj.done) return;

    // 如何obj.value本来就是promise，那么直接返回它，否则创建一个promise，并以obj.value兑现
    const p = Promise.resolve(obj.value);

    p.then((res) => {
      obj = iterator.next(res);
      worker(obj);
    });
  }
}

myAsyncAwait(test2);
console.log('!!!');