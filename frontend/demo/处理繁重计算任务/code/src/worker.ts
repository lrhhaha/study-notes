import type { INode, IResult1, IResult3 } from './types'

console.log("web worker");

self.addEventListener("message", (event) => {
  handleMessage(event.data.data);
});

function handleMessage(data: Array<INode>) {
  console.log(data);
  if (data === undefined) return;
  const startTime1 = performance.now()
  // 分类
  const { regionMap, resourceMap } = handleFenLei(data);

  // 按 region 分组，计算出每一类 region 下 value 平均值、最大值、最小值、中位值、总和
  const res1 = calcuFn1(regionMap);
  console.log(res1);
  const endTime1 = performance.now()
  console.log(`花费${endTime1 - startTime1}毫秒`);


  //   按 region 分组，计算每一年，每一类 region 下 value 平均值、最大值、最小值、中位值、总和
  
  

  //   按 resource 分类，计算每一类 resource 下 value 平均值、最大值、最小值、中位值、总和
  const res3 = calcuFn3(resourceMap)
  console.log(res3);
}

// 分类
function handleFenLei(data: Array<INode>) {
  const regionMap: Map<string, INode[]> = new Map();
  const resourceMap: Map<string, INode[]> = new Map();
  // 每个类别排序
  data.forEach((item: INode) => {
    const { region, resource } = item;

    if (regionMap.has(region)) {
      regionMap.get(region)!.push();
    } else {
      regionMap.set(region, [item]);
    }

    if (resourceMap.has(resource)) {
      resourceMap.get(resource)!.push();
    } else {
      resourceMap.set(resource, [item]);
    }
  });

  return {
    regionMap,
    resourceMap,
  };
}

function calcuFn1(regionMap: Map<string, INode[]>) {
  const result: Array<IResult1> = [];
  const newRegionMap: Map<string, INode[]> = new Map();

  regionMap.forEach((arr, region) => {
    const newArr = arr.toSorted((a, b) => (a.value - b.value));
    newRegionMap.set(region, newArr);
  });

  newRegionMap.forEach((arr: Array<INode>, region) => {
    const len = arr.length;
    const item: IResult1 = {
      region,
      average: -999,
      max: arr[len - 1].value,
      min: arr[0].value,
      middle: -999,
      total: -999,
    };
    // console.log(arr[(len + 1) / 2]);
    item.middle =
      len % 2 === 0
        ? (arr[len / 2].value + arr[len / 2 - 1].value) / 2
        : arr[(len - 1) / 2].value;

    item.total = arr.reduce((acc: number, curr: INode) => (acc + curr.value), 0);
    item.average = item.total! / len

    result.push(item)
  });

  return result
}

function calcuFn3(resourceMap: Map<string, INode[]>) {
  const result: Array<IResult3> = [];
  const newResourceMap: Map<string, INode[]> = new Map();

  resourceMap.forEach((arr, resource) => {
    const newArr = arr.toSorted((a, b) => (a.value - b.value));
    newResourceMap.set(resource, newArr);
  });

    newResourceMap.forEach((arr: Array<INode>, resource) => {
    const len = arr.length;
    const item: IResult3 = {
      resource,
      average: -999,
      max: arr[len - 1].value,
      min: arr[0].value,
      middle: -999,
      total: -999,
    };
    // console.log(arr[(len + 1) / 2]);
    item.middle =
      len % 2 === 0
        ? (arr[len / 2].value + arr[len / 2 - 1].value) / 2
        : arr[(len - 1) / 2].value;

    item.total = arr.reduce((acc: number, curr: INode) => (acc + curr.value), 0);
    item.average = item.total! / len

    result.push(item)
  });

  return result
}
