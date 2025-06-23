在现代 web 项目中，我们一般使用 XHR（XMLHttpRequest）或 fetch 发送 http 请求，以实现网页在不刷新的情况下获取数据（即实现 AJAX）。

其中 XMLHttpRequest 拥有更好的兼容性，但它的缺点就是原生使用方式较为繁杂。

本文将尝试对 XMLHttpRequest 进行简单的封装，以便加深对其的理解。

# 原生使用

如下所示是 XMLHttpRequest 的简易使用demo：
```javascript
function basicGetRequest() {
  const xhr = new XMLHttpRequest();

  // 配置请求
  xhr.open("GET", "https://xxx/car");

  // 设置响应处理
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      // 请求完成
      if (xhr.status === 200) {
        // 获取数据
        const data = JSON.parse(xhr.response)
        doSomething(data)
      } else {
        console.error("GET 请求失败:", xhr.status, xhr.statusText);
      }
    }
  };

  // 发送请求
  xhr.send();
}
```

可见即使是一个简单的 GET 请求，XMLHttpRequest 也需要分四步走，且处理异步操作的方式是颇有年头的回调函数的方式。
不仅操作起来复杂，稍有不慎还可能出现“回调地狱”的情况。

接下来本文将尝试使用 Promise 对 XMLHttpRequest 进行封装，达到类似 fetch 的调用效果。


# 使用 Promise 封装

对 XHLHttpRequest 进行封装，会涉及很多要点，本次封装将简单遵循以下约定，以便实现基础的封装：

1. 使用 Promise 封装 XMLHttpRequest
2. 处理 HTTP 状态码
   1. 在 [200, 300) 区间，以及 304 时，视为请求成功，Promise 兑现
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
  doSomething(res)
});
```
