// 支持自定义扁平化深度控制
// 处理空数组和undefined元素

function flat(array, deep) {
  if (!Array.isArray(array)) {
    throw new TypeError("arguments[0] must be an array");
  }

  deep = deep ?? Infinity;

  return array.reduce((acc, curr) => {
    if (deep > 0 && Array.isArray(curr)){
      return acc.concat(flat(curr, deep - 1))
    } else {
      return [...acc, curr]
    }
  }, [])
}

console.log(flat([1, [2, 3], [4, [5, 6]]], 1));