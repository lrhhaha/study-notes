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
  console.log('start');
  const p1 = new Promise((resolve) => {
    setTimeout(() => {
      resolve("p1 data");
    }, 2000);
  });

  p1.then(res => {
    console.log(res);
  })

  console.log('end');
}

// test()

async function test1() {
  console.log('start');
  const p1 = new Promise((resolve) => {
    setTimeout(() => {
      resolve("p1 data");
    }, 2000);
  });

  const res = await p1

  console.log(res);
}
// test1()


function* test2() {
  console.log('start');

  const p1 = new Promise((resolve) => {
    setTimeout(() => {
      resolve("p1 data");
    }, 2000);
  });

  const res = yield p1

  console.log(res);
}


function myAsyncAwait(generator) {

  const iterator = generator()

  const { value: p} = iterator.next()

  p.then(res => {
    iterator.next(res)
  })

}

myAsyncAwait(test2)