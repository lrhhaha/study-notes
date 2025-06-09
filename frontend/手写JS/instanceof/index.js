function myInstanceof(target, constructor) {
  // 根据instanceof的特性：第一个参数如果是原始值，则返回false
  if (target === null || (typeof target !== 'object' && typeof target !== 'function')) {
    return false
  }
  // 第二个参数必须为函数，否则会抛出错误
  if (typeof constructor !== 'function') {
    throw new TypeError('argument[1] is not callable')
  }

  // 构造函数的原型对象
  const prototype = constructor.prototype
  // 当constructor为箭头函数时，prototype为undefined，抛出错误
  if (prototype === undefined) {
    throw new TypeError("arguments[1] has non-object prototype 'undefined' in instanceof check")
  } 
  
  // 用于存放target的原型链
  let proto = target.__proto__

  // 一直循环寻找，直至原型链末端
  while (proto !== null) {
    if (proto === prototype) return true
    proto = proto.__proto__
  }
  return false
}

// =======测试用例==========

// 左侧操作数为原始值
console.log(myInstanceof(123, Number)) // false
console.log(myInstanceof(null, Object)) // false
console.log(myInstanceof(undefined, Object)) // false

// 常规情况，左侧为对象，右侧为构造函数
console.log(myInstanceof([], Array)) // true
console.log(myInstanceof([], Object)) // true
console.log(myInstanceof([], String)) // false

// 右侧操作数为非函数
try {
  console.log(myInstanceof({}, {}))
} catch (e) {
  console.log(e.message) // argument[1] is not callable
}

// 右侧操作数为箭头函数
try {
  console.log(myInstanceof({}, (() => {})))
} catch (e) {
  console.log(e.message) // arguments[1] has non-object prototype 'undefined' in instanceof check
}