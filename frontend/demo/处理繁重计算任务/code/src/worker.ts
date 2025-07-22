import type { IData, IResult1 } from './types'

console.log("web worker");

self.addEventListener("message", (event) => {
  handleMessage(event.data.data);
});

function handleMessage(data: Array<IData>) {
  console.log(data);
  if (data === undefined) return;
  const startTime1 = performance.now()
  console.time('代码片段执行时间');
  // 分类
  const { regionMap, resourceMap } = handleFenLei(data);

  // 按 region 分组，计算出每一类 region 下 value 平均值、最大值、最小值、中位值、总和

  const res1 = calcuFn1(regionMap);
  console.log(res1);
  const endTime1 = performance.now()
  console.timeEnd('代码片段执行时间');
  console.log(`花费${endTime1 - startTime1}毫秒`);


}

// 分类
function handleFenLei(data: Array<IData>) {
  const regionMap: Map<string, IData[]> = new Map();
  const resourceMap = new Map();
  // 每个类别排序
  data.forEach((item: IData) => {
    const { region, resource } = item;

    if (regionMap.has(region)) {
      regionMap.get(region)!.push();
    } else {
      regionMap.set(region, [item]);
    }

    if (resourceMap.has(resource)) {
      resourceMap.get(resource).push();
    } else {
      resourceMap.set(resource, [item]);
    }
  });

  return {
    regionMap,
    resourceMap,
  };
}

function calcuFn1(regionMap: Map<string, IData[]>) {
  const result: Array<IResult1> = [];
  const newRegionMap: Map<string, IData[]> = new Map();

  regionMap.forEach((arr, region) => {
    const newArr = arr.toSorted((a, b) => (a.value - b.value));
    newRegionMap.set(region, newArr);
  });

  newRegionMap.forEach((arr: Array<IData>, region) => {
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

    item.total = arr.reduce((acc: number, curr: IData) => (acc + curr.value), 0);
    item.average = item.total! / len

    result.push(item)
  });

  return result
}
