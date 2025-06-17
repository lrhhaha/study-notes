
// 使用reduce实现指定深度的数组扁平化函数
function flattenArrayWithDepth(arr, depth = 1) {
  return depth > 0 ? arr.reduce((acc, item) => {
    if (Array.isArray(item)) {
      return acc.concat(flattenArrayWithDepth(item, depth - 1));
    } else {
      return acc.concat(item);
    }
  }, []) : arr.slice();
}

const arr = [1,2, [3, [4]]]
console.log(flattenArrayWithDepth(arr, 1))

function flat(array, depth) {
  if (!Array.isArray(array)) {
    throw new TypeError("arguments[0] must be an array");
  }

  depth = depth ?? Infinity;

  return array.reduce((acc, curr) => {
    if (depth > 0 && Array.isArray(curr)){
      return acc.concat(flat(curr, depth - 1))
    } else {
      return [...acc, curr]
    }
  }, [])
}