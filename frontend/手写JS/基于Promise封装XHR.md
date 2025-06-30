在现代 web 项目中，我们一般使用 XHR（XMLHttpRequest）或 fetch 发送 http 请求，以实现网页在不刷新的情况下获取数据（即实现 AJAX）。

其中 XMLHttpRequest 拥有更好的兼容性，但它的缺点就是原生使用方式较为繁杂。

本文将尝试对 XMLHttpRequest 进行简单的封装，以便加深对其的理解。

# 原生使用

如下所示是 XMLHttpRequest 的简易使用 demo：

```javascript
const xhr = new XMLHttpRequest();

// 初始化一个新创建的请求
xhr.open("GET", "https://xxx/car");

// 设置响应处理
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4) {
    // 请求完成
    if (xhr.status === 200) {
      // 获取数据
      const data = JSON.parse(xhr.response);
      doSomething(data);
    } else {
      console.error("GET 请求失败:", xhr.status, xhr.statusText);
    }
  }
};

// 发送请求
xhr.send();
```

可见即使是一个简单的 GET 请求，XMLHttpRequest 也需要分四步走:

1. new
2. open
3. onreadystatechange
4. send

且处理异步操作的方式是事件监听，使用稍显繁琐。

接下来本文将尝试使用 Promise 对 XMLHttpRequest 进行封装，达到类似 fetch 的调用效果。

# 使用 Promise 封装

## 封装目标

对 XHLHttpRequest 进行封装，会涉及很多要点，本次封装将简单遵循以下约定，以便实现基础的封装：

1. 使用 Promise 封装 XMLHttpRequest
2. 处理 HTTP 状态码
   1. 在 [200, 300) 区间，以及 304（缓存命中） 时，视为请求成功，Promise 兑现
   2. 其余状态码视为请求失败，Promise 拒绝
3. 处理查询字符串，使用 params 配置项，允许传入以下两种数据格式：
   1. URLSearchParams
   2. 普通对象
4. 处理请求体数据，使用 data 配置项：
   1. 只允许传入普通对象
   2. 简单处理为 application/json 格式，暂不支持其他个数
5. 响应体内容，如果是 JSON 格式，则使用 JSON.parse 处理，否则直接返回
6. 支持设置请求头
7. 支持传入 timeout 配置项，设置请求超时时间

关键要点：

1. 借助 readystatechange 事件，监测请求进度
2. 使用 URLSearchParams 对查询字符串进行编码
3. 使用 XMLHttpRequest 的 timeout 属性，及使用 setTimeout，对超时机制进行双重保护

## step by step

### step1 - xhr 基础使用

使用原生 XHRHttpRequest 发送请求，至少需要以下四个步骤

1. 使用 XHRHttpRequest 构造函数，创建 xhr 实例对象
2. 使用 xhr.open 初始化请求
3. 监听 readystatechange 事件，监听请求进度（处理响应体数据）
4. 调用 xhr.send， 发送请求

主要需要注意的是 readystatechange 事件，此事件会在当 xhr.readyState 的值改变的时候触发，如下表格代表 readyState 的值及其对应的状态：
| 值 | 状态 | 描述 |
|--- | --- | --- |
| 0 | UNSENT | 代理被创建，但尚未调用 open 方法 |
| 1 | OPENED | open 方法已经被调用 |
| 2 | HEADERS_RECEIVED | send 方法已经被调用，并且头部和状态已经可获得 |
| 3 | LOADING | 下载中 |
| 4 | DONE | 下载操作已完成 |

一般而言，我们只关心 xhr 完成请求体下载的状态（即 readyState 为 4）。当然，本次请求可能是失败的，所以需要借助 xhr.status 属性判断 HTTP 状态码，然后可使用 xhr.response 属性读取响应体内容。

```javascript
// 绑定事件处理函数，readyState发生改变时触发
xhr.onreadystatechange = function () {
  // 当readyState为4时，
  if (xhr.readyState === 4) {
    // HTTP状态码在[200, 300)区间，即304（缓存命中）时视为请求成功，可根据业务具体调整
    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
      // 自定义响应体处理函数
      // handleResponse(xhr.response);
    } else {
      // 请求失败
      // do something
    }
  }
};
```

四步走代码如下所示：

```javascript
// 创建xhr实例
const xhr = new XMLHttpRequest();

// 初始化一个新创建的请求
xhr.open("GET", "https://xxx/car");

// 设置响应处理
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4) {
    if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
      // handleResponse(xhr.response);
    } else {
      // 请求失败
      // do something
    }
  }
};

// 发送请求
xhr.send();
```

上述代码无疑是可用的，但复用性太差，且对于异步操作的处理，不符合现代 JS 的处理逻辑，接下来我们将尝试对此“四步走”代码进行封装，增加复用性。而使用 Promise 语法处理进行异步编程。

### step2 - promise 化 xhr

目标：编写一个函数，使用 Promise 包装上述“四步走”代码，使函数返回值是 promise，调用其 then 函数处理响应体数据。增强复用性，符合现代异步处理流程。

```javascript
function getCarData() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("GET", "https://xxx/car");

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
          // 异步操作完成时，将promise状态改为fulfilled，兑现值为响应体数据
          resolve(xhr.response);
        } else {
          // 拒绝原因为HTTP状态码，具体可根据业务调整
          reject(xhr.status);
        }
      }
    };

    xhr.send();
  });
}

getCarData()
  .then((res) => {
    // handleResponse(res)
  })
  .catch((err) => {
    // do something
  });
```

上述代码已经完成解决了原生 XMLHttpRequest 处理异步操作时繁琐的问题了，但其复用性仍需改进。

接下来我们会基于 getCarData 函数，编写一个名为 myAjax 的函数，旨在增强其复用性，并对其逐步进行扩展。  
首先我们会将请求方法及 url 抽离出来，形成基础版本。

```javascript
function myAjax({
  // method默认值为GET请求
  method = "GET",
  url,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url);

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
          resolve(xhr.response);
        } else {
          reject(xhr.status);
        }
      }
    };

    xhr.send();
  });
}

myAjax()
  .then((res) => {
    // handleResponse(res)
  })
  .catch((err) => {
    // do something
  });
```

### step3 - 处理响应体

这里需要澄清一个可能存在的误区，我们一般使用 xhr.response 来获取响应体的内容，但是 xhr.response 的值并非是服务端返回的响应体的原始内容。
而是根据 xhr.responseType 的类型处理后的数据。

xhr.responseType 不会发送给服务器，只会告诉 xhr 应该以什么方式对响应体的数据进行处理。

而 xhr.responseType 的默认值为空字符串，它的表现与设置为'text'时一致，会将返回的响应体数据处理为字符串。

具体详细参考 MDN 文档：

- [xhr.responseType](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/responseType)
- [xhr.response](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/response)

举个例子：
当我们从接口文档得知某个接口返回的数据是 JSON 格式的，那么我们就设置 responseType 为'json'，那么 xhr 在接收到服务端发送过来的数据之后,就会经历 字节流 → UTF-8 解码 → 字符串 → JSON.parse()的处理，最终 response 的值就是普通 JS 对象。

而 step2 中对响应体的处理只是简单地将下载得到的响应体处理为字符串，然后作为 promise 的兑现值返回出去。

现在我们将为 myAjax 方法增加一个 responseType 参数，使 response 能得到正确的处理，且鉴于现代 web 应用大部分 ajax 请求返回的数据格式是 JSON 数据，所以默认值设置为'json'。

```javascript
function myAjax({
  method = "GET",
  url,
  // 默认情况下，responseType是JSON格式数据
  responseType = "json",
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url);

    xhr.responseType = responseType;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
          // 经过正确处理的响应体数据
          resolve(xhr.response);
        } else {
          reject(xhr.status);
        }
      }
    };

    xhr.send();
  });
}

myAjax()
  .then((res) => {
    console.log(typeof res); // 'object'
  })
  .catch((err) => {
    // do something
  });
```

### step4 - 处理查询字符串

我们在发送请求时，往往需要传递参数，以获得指定数据。而传递数据的方式一般有以下两种：

1. URL 查询字符串
2. 将数据放在请求体中（在 POST、PUT 请求中可用）

本小节将实现在 myAjax 方法中以简便的方式添加查询字符串。

首先看看查询字符串的定义：假如一个url为，http://example.com?name=小明&age=18, 此url的查询参数就是"?name=小明&age=18", 每个参数之间使用 & 号隔开。

上面的例子中，查询字符串包含了中文，需要发送给服务器的话，还需要对其进行url编码，具体可使用如下两种方式：
#### 方式一：encodeURIComponent


使用例子如下所示
```javascript
const baseURL = 'http://example.com'
const part1 = `${encodeURIComponent('name')}=${encodeURIComponent('小明')}`
const part2 = `${encodeURIComponent('age')}=${encodeURIComponent('18')}`

const url = `${baseURL}?${part1}&${part2}`
console.log(url) // http://example.com?name=%E5%B0%8F%E6%98%8E&age=18
```


### step5 - 处理请求体

### step6 - 处理请求头

### step7 - 处理 timeout 机制

talk is cheap, show you the code：

```javascript
function http({ method = "GET", url, headers, params, data, timeout }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 用于保存处理请求超时的timer
    let timer = null;

    // timeout设置为0则代表不会超时
    xhr.timeout = timeout ?? 0;

    // 监听请求进度
    xhr.onreadystatechange = function () {
      // readyState值为4，代表下载操作已完成
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
          try {
            // 如返回数据为 JSON 格式，则解析后返回
            resolve(JSON.parse(xhr.response));
          } catch (err) {
            // 返回数据为非 JSON 时，直接返回
            resolve(xhr.response);
          }
        } else {
          reject(xhr.status);
        }
      }
    };

    // 处理查询字符串，拼接url
    if (params) {
      let suffix = "";
      if (params instanceof URLSearchParams) {
        suffix = params.toString();
      } else if (Object.prototype.toString.call(params) === "[object Object]") {
        // 理论上可以直接使用URLSearchParams，但是它会把空格编码成'+'（理论上没问题，但是可能造成误解）
        // suffix = new URLSearchParams(params).toString()

        suffix = Object.entries(params)
          .map(([key, value]) => {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          })
          .join("&");
      }
      url = suffix ? `${url}?${suffix}` : url;
    }

    xhr.open(method, url);

    // 处理请求体数据
    let strData;
    if (["POST", "PUT", "DELETE"].includes(method) && data) {
      // 格式化为 JSON 格式，并设置 content-type 请求头
      strData = JSON.stringify(data);
      xhr.setRequestHeader("content-type", "application/json");
    }

    // 设置其余请求头
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    // 网络中断或无效url
    xhr.onerror = function () {
      // 清除延时器
      clearTimeout(timer);
      timer = null;

      reject(new Error("Network Error"));
    };

    // 请求完成，无论状态码是什么
    xhr.onload = function () {
      // 清除延时器
      clearTimeout(timer);
      timer = null;
    };

    // 监听xhr超时时间
    xhr.ontimeout = function () {
      // 清除延时器
      clearTimeout(timer);
      timer = null;

      reject("timeout");
    };

    if (timeout) {
      timer = setTimeout(() => {
        // 请求超时机制双重保护，调用 abort 方法终止请求
        if (timer) {
          clearTimeout(timer);
          timer = null;
          xhr.abort();
          reject("timeout");
        }
      }, timeout);
    }

    xhr.send(strData || undefined);
  });
}

// 使用例子
http({
  method: "POST",
  url: "http://xxx/car",
  params: { type: "i am type" },
  headers: {
    header1: "1",
    header2: "2",
  },
  data: {
    page: 1,
    keyword: "hello",
  },
}).then((res) => {
  doSomething(res);
});
```
