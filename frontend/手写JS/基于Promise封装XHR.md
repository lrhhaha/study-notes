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
  // 请求完成
  if (xhr.readyState === 4) {
    // HTTP状态码为200，请求成功
    if (xhr.status === 200) {
      // 获取数据
      doSomething(xhr.response);
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
3. 处理查询字符串，使用 params 配置项。
4. 处理请求体数据，使用 data 配置项。
5. 支持设置请求头
6. 支持传入 timeout 配置项，设置请求超时时间

## step by step

### step1 - xhr 基础使用

使用原生 XHRHttpRequest 发送请求，至少需要以下四个步骤

1. 使用 XHRHttpRequest 构造函数，创建 xhr 实例对象
2. 使用 xhr.open 初始化请求
3. 监听 readystatechange 事件，监听请求进度（处理响应体数据）
4. 调用 xhr.send， 发送请求

主要需要注意的是 readystatechange 事件，此事件会在 xhr.readyState 的值改变的时候触发，如下表格代表 readyState 的值及其对应的状态：
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
xhr.open("GET", "http://xxx/car");

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

### step2 - Promise 化 xhr

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

上述代码已经解决了原生 XMLHttpRequest 处理异步操作时繁琐的问题了，但其复用性仍需改进。

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

myAjax({
  url: "http://example/car",
})
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
当我们从接口文档得知某个接口返回的数据是 JSON 格式的，那么我们就设置 responseType 为'json'，那么 xhr 在接收到服务端发送过来的数据之后,就会经历 字节流 → UTF-8 解码 → 字符串 → JSON.parse() 的处理，最终 response 的值就是普通 JS 对象。

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

myAjax({
  url: "http://example/car",
})
  .then((res) => {
    console.log(typeof res); // 'object'
  })
  .catch((err) => {
    // do something
  });
```

### step4 - 处理请求头

本小节将对请求头进行处理，使用到的 api 为 [xhr.setRequestHeader(header, value)](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/setRequestHeader), 非常简便，唯一需要注意的是需要在 open 和 send 方法之间调用。

myAjax 使用 headers 参数接收请求头，类型为一个普通对象，键值对即为需要设置的请求头。

```javascript
function myAjax({ method = "GET", url, responseType = "json", headers = {} }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url);

    xhr.responseType = responseType;

    // 设置请求头
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

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

myAjax({
  url: "http://example/car",
  headers: {
    header1: "i am header1",
    header2: "i am header2",
  },
})
  .then((res) => {
    // handleData(res)
  })
  .catch((err) => {
    // do something
  });
```

### step5 - 处理查询字符串

#### 关于查询字符串

我们在发送请求时，往往需要传递参数，而传递数据的方式一般有以下两种：

1. URL 查询字符串
2. 将数据放在请求体中（在 POST、PUT 等请求中可用）

本小节将实现在 myAjax 方法中以简便的方式添加查询字符串。

首先看看查询字符串的定义：假如一个 url 为: http://example.com?name=小明&age=18, 此 url 的查询字符串就是问号后面的字符串："name=小明&age=18", 每个参数之间使用 & 号隔开。

上面的例子中，查询字符串包含了特殊字符（如中文），需要发送给服务器的话，还需要对其进行 url 编码，具体可使用如下两种方式：

##### 方式一：encodeURIComponent

使用 [encodeURIComponent](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) 方法对查询字符串中的“键值对”单独进行编码。

> encodeURIComponent 的作用可以概述为：将字符串中的特殊字符转换为 URI 安全的编码格式。

使用例子如下所示

```javascript
// 需要组装的url为：http://example.com?name=小明&age=18
const baseURL = "http://example.com";
const part1 = `${encodeURIComponent("name")}=${encodeURIComponent("小明")}`;
const part2 = `${encodeURIComponent("age")}=${encodeURIComponent("18")}`;

const url = `${baseURL}?${part1}&${part2}`;
console.log(url); // http://example.com?name=%E5%B0%8F%E6%98%8E&age=18
```

注意：不可以直接对整个查询字符串进行编码，否则用作分隔符的'&'号也会被编码：

```javascript
console.log(encodeURIComponent("name=小明&age=18")); // name%3D%E5%B0%8F%E6%98%8E%26age%3D18
```

##### 方式二：URLSearchParams

使用 [URLSearchParams](https://developer.mozilla.org/zh-CN/docs/Web/API/URLSearchParams)，直接对查询字符串进行处理。

此方式比较简便，在创建 URLSearchParams 实例对象时，传入查询字符串的键值对，然后调用其 toString 方法便可获得编码后的字符串：

```javascript
// 需要组装的url为：http://example.com?name=小明&age=18

const baseURL = "http://example.com";
// 创建URLSearchParams实例对象，并传入键值对
const params = new URLSearchParams({ name: "小明", age: 18 });
// 调用toString方法，获得编码后的字符串
const url = `${baseURL}?${params.toString()}`;

console.log(url); // http://example.com?name=%E5%B0%8F%E6%98%8E&age=18
```

##### 两者区别

encodeURIComponent 和 URLSearchParams 都是对字符串进行 url 编码的方式，它们之间的区别在于对空格的处理上：

- encodeURIComponent 编码为'%20'
- URLSearchParams 编码为'+'

但其实这两种方式都是正确可用的。

```javascript
console.log(encodeURIComponent("ABC abc")); // ABC%20abc (空格被编码为 %20)

const params = new URLSearchParams({ text: "ABC abc" });
console.log(params.toString()); // text=ABC+abc (空格被编码为 +)
```

#### 具体实现

回到 myAjax 函数上，我们约定使用 params 参数用于添加查询字符串。
params 参数接受以下两种形式：

1. URLSearchParams 实例对象
2. 常规对象

对于上述两种形式的数据，将会分别调用其 toString 方法和使用 encodeURIComponent 函数去构造查询字符串。

```javascript
function myAjax({
  method = "GET",
  url,
  responseType = "json",
  headers = {},
  // 查询字符串（接受URLSearchParams实例及常规对象）
  params,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 处理查询字符串
    if (params) {
      let suffix = "";

      if (params instanceof URLSearchParams) {
        // URLSearchParams实例

        suffix = params.toString();
      } else if (Object.prototype.toString.call(params) === "[object Object]") {
        // 是常规对象

        suffix = Object.entries(params)
          .map(([key, value]) => {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          })
          .join("&");
      }
      url = suffix ? `${url}?${suffix}` : url;
    }

    xhr.open(method, url);

    xhr.responseType = responseType;

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

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

myAjax({
  url: "http://exampe.com",
  params: {
    name: "小明",
    age: 18,
  },
})
  .then((res) => {
    // handleData(res)
  })
  .catch((err) => {
    // do something
  });
```

### step6 - 处理请求体

除了 step5 中使用查询字符串的方式传递参数，（在特定请求中）我们还可以将参数放置在请求体中携带。

以 POST 请求举例，根据请求体数据的类型不同，一般可以分为以下四种媒体类型（MIME type）进行传输：

- application/x-www-form-urlencoded：数据以键值对形式发送，键和值都进行了 URL 编码（name=Jack&age=18）
- multipart/form-data：用于文件上传或需要同时发送文件和数据时。
- text/xml：用于发送 XML 数据。
- application/json：用于发送 JSON 格式的数据。

上述 MIME type 需要正确设置在 content-type 请求头中，以便服务器知道应该以什么方式对请求体数据进行解析。

myAjax 对请求体和用户设置的 content-type 约定如下：

1. 用户设置的 content-type 拥有最高优先级，尝试将 data 转为对应类型（如转换不成功，则会出现请求体数据类型与 content-type 不一致的情况，可能会导致服务器解析请求体失败，这需要用户对代码进行调整）。
2. 用户不设置 content-type 时：
   1. 如 data 是特殊类型：
      1. data 是 FormData：直接添加到请求体中，因content-type 涉及 boundary，不额外处理，由浏览器自动设置。
      2. data 是 URLSearchParams：调用 toString 方法，转化为 url 编码字符串，设置 content-type：application/x-www-form-urlencoded
   2. data 是普通对象：转为 JSON 类型，设置 content-type: application/json
   3. data 为 text 或其他: 直接添加到请求体中，content-type：text/xml

```javascript
function myAjax({
  method = "GET",
  url,
  responseType = "json",
  headers = {},
  params,
  data,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (params) {
      let suffix = "";
      if (params instanceof URLSearchParams) {
        suffix = params.toString();
      } else if (Object.prototype.toString.call(params) === "[object Object]") {
        suffix = Object.entries(params)
          .map(([key, value]) => {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          })
          .join("&");
      }
      url = suffix ? `${url}?${suffix}` : url;
    }

    xhr.open(method, url);

    xhr.responseType = responseType;

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    // 处理请求体
    let requestData = null;
    if (data) {
      if (data instanceof FormData) {
        // data是FormData类型
        requestData = data;
      } else if (data instanceof URLSearchParams) {
        // data是URLSearchParams类型

        requestData = data.toString();
        // 如用户设置了content-type请求头，则不作修改
        if (!headers["content-type"]) {
          xhr.setRequestHeader(
            "content-type",
            "application/x-www-form-urlencoded"
          );
        }
      } else if (typeof data === "object") {
        // data为普通对象

        // 只转化为JSON或url编码字符串
        if (
          ["application/x-www-form-urlencoded", "application/json"].includes(
            headers["content-type"]
          )
        ) {
          if (headers["content-type"] === "application/x-www-form-urlencoded") {
            const params = new URLSearchParams(data);
            requestData = params.toString();
          } else {
            requestData = JSON.stringify(data);
          }
        } else {
          // 默认情况下转为JSON格式
          requestData = JSON.stringify(data);
          if (!headers["content-type"]) {
            xhr.setRequestHeader("content-type", "application/json");
          }
        }
      } else {
        requestData = data;
        if (!headers["content-type"]) {
          xhr.setRequestHeader("content-type", "text/xml");
        }
      }
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
          resolve(xhr.response);
        } else {
          reject(xhr.status);
        }
      }
    };

    // 请求体内容作为send参数传入
    xhr.send(requestData);
  });
}

myAjax({
  method: "POST",
  url: "http://exampe/car",
  data: {
    name: "小明",
  },
})
  .then((res) => {
    // handleData(res)
  })
  .catch((err) => {
    // do something
  });
```

### step7 - 处理 timeout 机制

接下来我们将为 myAjax 设置请求的超时时间，如果超过某个设定的时间，就视为请求失败。

我们将使用 timeout 参数代表超时时间，单位是毫秒。其默认值为 0，代表没有超时限制。

#### 实现方案
##### 方案一

我们可以借助原生的 [xhr.timeout](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/timeout) 属性，设置超时时间（单位毫秒，0 代表没有超时限制）。  
当 xhr 请求超时时，会触发 [timeout 事件](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/timeout_event)，我们可以在此事件监听函数中执行对应的逻辑。

```javascript
var xhr = new XMLHttpRequest();
xhr.open("GET", "/server");

// 超时时间，单位是毫秒
xhr.timeout = 2000;

xhr.ontimeout = function (e) {
  // XMLHttpRequest 超时。在此做某事。
};

xhr.send();
```

##### 方案二

上述的 xhr.timeout 属性并非在 XMLHttpRequest 推出之初就拥有，而是后续新增的特性，所以可能会有部分浏览器不支持此属性。

当然，即使这个属性是后推出的，但距今也是很长时间，实际上我们要找到不支持它的浏览器也不太容易，但出于练手的目的，文本还是配合其他方案，给 myAjax 的超时机制做一个双重保险。

我们需要使用 setTimeout + [xhr.abort](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/abort) 方法终止请求，去实现超时机制。

当然，我们还需要两个事件监听函数，分别是请求完成（无论 HTTP 状态码是多少）和请求错误（网络错误等）事件，在这两个事件处理函数中清除延时器。

```javascript
// 网络中断或无效url
xhr.onerror = function () {
  clearTimeout(timer);
  timer = null;
};

// 请求完成，无论状态码是什么
xhr.onload = function () {
  clearTimeout(timer);
  timer = null;
};

timer = setTimeout(() => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    // 调用 abort 方法终止请求
    xhr.abort();
  }
}, timeout);
```

#### 具体实现

```javascript
function myAjax({
  method = "GET",
  url,
  responseType = "json",
  headers = {},
  params,
  data,
  // 默认无超时限制
  timeout = 0,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (params) {
      let suffix = "";
      if (params instanceof URLSearchParams) {
        suffix = params.toString();
      } else if (Object.prototype.toString.call(params) === "[object Object]") {
        suffix = Object.entries(params)
          .map(([key, value]) => {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          })
          .join("&");
      }
      url = suffix ? `${url}?${suffix}` : url;
    }

    xhr.open(method, url);

    xhr.responseType = responseType;

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    let requestData = null;
    if (data) {
      if (data instanceof FormData) {
        requestData = data;
      } else if (data instanceof URLSearchParams) {
        requestData = data.toString();
        if (!headers["content-type"]) {
          xhr.setRequestHeader(
            "content-type",
            "application/x-www-form-urlencoded"
          );
        }
      } else if (typeof data === "object") {
        if (
          ["application/x-www-form-urlencoded", "application/json"].includes(
            headers["content-type"]
          )
        ) {
          if (headers["content-type"] === "application/x-www-form-urlencoded") {
            const params = new URLSearchParams(data);
            requestData = params.toString();
          } else {
            requestData = JSON.stringify(data);
          }
        } else {
          requestData = JSON.stringify(data);
          if (!headers["content-type"]) {
            xhr.setRequestHeader("content-type", "application/json");
          }
        }
      } else {
        requestData = data;
        if (!headers["content-type"]) {
          xhr.setRequestHeader("content-type", "text/xml");
        }
      }
    }

    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
          resolve(xhr.response);
        } else {
          reject(xhr.status);
        }
      }
    };

    if (timeout > 0) {
      let timer = null;
      xhr.timeout = timeout;

      // xhr.timeout超时事件
      xhr.ontimeout = function () {
        clearTimeout(timer);
        timer = null;

        reject("timeout");
      };

      // 请求完成，无论状态码是什么
      xhr.onload = function () {
        // 清除延时器
        clearTimeout(timer);
        timer = null;
      };

      // 网络中断或无效url
      xhr.onerror = function () {
        // 清除延时器
        clearTimeout(timer);
        timer = null;

        reject(new Error("Network Error"));
      };

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

    xhr.send(requestData);
  });
}

myAjax({
  method: "POST",
  url: "http://exampe/car",
  timeout: 60 * 1000,
})
  .then((res) => {
    console.log(typeof res); // 'object'
  })
  .catch((err) => {
    // do something
  });
```

# 总结

本文主要内容是使用 Promise 语法去封装原生 XMLHttpRequest 请求，这是一个庞大的工程，所以本文将封装过程分成了多个步骤，尝试逐步完善，但距离面面俱到还有漫长的距离。

后续各位同学还可以在此基础上继续扩展功能和完善错误处理系统，虽说真理无穷，但进一寸有进一寸的快乐！
