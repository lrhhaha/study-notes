
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
      clearInterval(interval)
      timer = null;
      interval = null
      reject(new Error("Network Error"));
    };
    // 请求完成，无论状态码是什么
    xhr.onload = function () {
      clearTimeout(timer);
      clearInterval(interval)
      timer = null;
      interval = null;
    };

    let timer;
    let interval;
    if (timeout) {
      timer = setTimeout(() => {
        if (timer) {
          clearTimeout(timer)
          timer = null;
          xhr.abort();
        }
      }, timeout);
    }
    if (timeout) {
      interval = setInterval(() => {
        if (interval) {
          clearInterval(interval)
          interval = null
          xhr.abort();
        }
      }, timeout)
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