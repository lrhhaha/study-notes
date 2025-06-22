1. 使用Promise封装XMLHttpRequest
2. 当HTTP状态码在[200, 300)区间，以及304时，视为请求成功
3. 使用params配置项，处理查询字符串
4. 使用data配置项，处理请求体内容。请求体数据格式，只简单处理为JSON格式
5. 响应体内容，如果是JSON格式，则使用JSON.parse处理，否则直接返回
6. 支持设置请求头
7. 支持传入timeout配置项，设置请求超时时间


1. 借助readystatechange事件，监测请求进度
2.  


```javascript
function http({
  method = "GET",
  url,
  headers,
  // params：查询字符串，必须是一个简单对象或 URLSearchParams 对象
  params,
  data,
  timeout,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // timeout设置为0则代表不会超时
    xhr.timeout = timeout ?? 0

    xhr.onreadystatechange = function () {
      // 下载操作已完成
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          // 假设返回的是JSON格式的数据
          try {
            resolve(JSON.parse(xhr.response));
          } catch (err) {
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

        // 使用encodeURIComponent手动编码
        suffix = Object.entries(params)
          .map(([key, value]) => {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          })
          .join("&");
      }
      url = suffix ? `${url}?${suffix}` : url;
    }

    xhr.open(method, url);

    let strData;
    // 以下请求方法处理请求体
    if (["POST", "PUT", "DELETE"].includes(method) && data) {
      strData = JSON.stringify(data);
      xhr.setRequestHeader("content-type", "application/json");
    }

    // 设置请求头
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    // 网络中断或无效url
    xhr.onerror = function () {
      clearTimeout(timer);
      timer = null;
      reject(new Error("Network Error"));
    };
    // 请求完成，无论状态码是什么
    xhr.onload = function () {
      clearTimeout(timer);
      timer = null;
    };
    xhr.ontimeout = function() {
      reject('timeout')
    }

    let timer;
    if (timeout) {
      timer = setTimeout(() => {
        if (timer) {
          clearTimeout(timer)
          timer = null;
          xhr.abort();
          reject('timeout')
        }
      }, timeout);
    }

    xhr.send(strData || undefined);
  });
}

http({
  method: "POST",
  url: "http://localhost:3000/test/add",
  params: { type: "i am type" },
  headers: {
    haha1: "1",
    haha2: "2",
  },
  data: {
    page: 1,
    keyword: "hhh",
  },
}).then((res) => {
  console.log(typeof res);
  console.log(res);
});
```