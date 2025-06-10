在 JS 中，一般情况下，我们想判断某个引用值的类型，可以使用 instanceof 运算符，如 [] instanceof Array，其返回值为布尔值。    

但如果运行 [] instanceof Object，会发现其结果也是 true，这时我们可能会想当然地认为“数组也是广义上的对象，所以结果是 true”，这个结论本身是没有问题的，但我们还是需要站在 instanceof 的角度上看看，它使用什么标准去评判返回值是 true 还是 false。

# 一、基础理解
MDN 上对 instanceof 作用的描述为：    
> 检测构造函数的 prototype 属性是否出现在某个实例对象的原型链上。

翻译成人话就是：左侧操作数是一个对象，右侧操作数是一个构造函数，如果右侧构造函数的原型对象存在于左侧对象的原型链上，返回值为 true，反之为 false。

既然我们知道了两个最重要的信息，就是 原型链和 原型对象，那么我们就可以转换成代码的角度去思考，如何实现自己的 instanceof 函数了：
1. 获取构造函数的原型对象（即其 prototype 属性）
2. 循环读取对象的 \_\_proto\_\_ 属性来遍历其原型链
3. 如果构造函数的原型对象，与原型链上的某个对象相等（堆内存地址相等），则跳出循环，返回 true
4. 如果循环读取 \_\_proto\_\_ 至原型链末端 null（即 Object.prototype.\_\_proto\_\_）,则证明原型链上不存在构造函数的原型对象，返回 false。
根据上述思路，我们可以编写自己的 myInstanceof 函数：
```javascript
function myInstanceof(target, constructor) {
  // 构造函数的原型对象
  const prototype = constructor.prototype
  // 用于存放target的原型链
  let proto = target.__proto__

  // 一直循环寻找，直至原型链末端
  while (proto !== null) {
    if (proto === prototype) return true
    proto = proto.__proto__
  }
  return false
}
```

> 补充说明：   
文章会使用 \_\_proto\_\_ 属性来读取实例对象的构造函数的原型对象，但实际上这是非标准的用法（即使它被广泛支持）。    
标准做法应是调用 Reflect.getPrototypeOf()函数。   
但为了使文章代码更通俗简易，现直接使用 \_\_proto\_\_ 属性。

# 二、进阶理解
除了上述主体逻辑之外，我们还可以深入探究 instanceof 运算符的特点：
1. 左侧操作数可以是原始值，不会报错，但会直接返回 false
2. 右侧操作数
  a. 必须是广义上的对象
  b. 必须是能读取到 Symbol.hasInstance 属性（当然它是一个函数），然后调用它，并将左侧操作数作为实参传入

这里再提供一些关于 Symbol.hasInstance 的独家消息：
1. 实际上 Symbol.hasInstance 是存放于 Function.prototype 中的，所以只需判断右侧操作数是否是函数，就能判断它是否是能读取到 Symbol.hasInstance 属性的对象了。
2. 而众所周知，箭头函数也是函数，它同样能通过原型链访问 Symbol.hasInstance，但它的特殊点在于箭头函数是没有 prototype 属性的，所以将箭头函数作为右侧操作数同样会报错。

根据以上信息，完善 myInstanceof：
```javascript
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
```

# 三、关于 Symbol.hasInstance
JS 引擎规定了 Function.prototype[Symbol.hasInstance] 是不可被重新赋值的，但通过 Symbol.hasInstance，我们可以在定义类的时候，规定 instanceof 在自定义类上的行为。 

以下是 MDN 中在自定义类中重写 Symbol.hasInstance 的例子。需要注意的是，在自定义类中，需要将 Symbol.hasInstance 作为静态方法，而不是定义在其 prototype 上。
```javascript
class MyArray {
  // 静态方法
  static [Symbol.hasInstance](instance) {
    // instance就是左侧操作数
    return Array.isArray(instance);
  }
}
console.log([] instanceof MyArray); // true
```

# 四、总结
可以认为 instanceof 运算符的工作原理，实际上是调用右侧操作数的 Symbol.hasInstance 函数，并将左侧操作数作为参数传入，返回函数的返回值。  

而默认的 Symbol.hasInstance 函数是存放在 Function.prototype 中的。其主要逻辑是检测右侧构造函数的原型对象，是否存在于左侧对象的原型链上，如果存在返回 true，反之返回 false。

由于 JS 引擎的限制，我们无法对 Function.prototype[Symbol.hasInstance] 进行重新赋值，但是在自定义类中，我们可以通过 Symbol.hasInstance 来自定义 instanceof 的行为。
