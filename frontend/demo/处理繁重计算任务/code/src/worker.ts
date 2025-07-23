import type {
  INode,
  IResult1,
  IResult3,
  IEdge,
  IResult4,
  IResult2,
} from "./types";

// console.log("web worker");

self.addEventListener("message", (event) => {
  handleMessage(event.data.nodeList, event.data.edgeList);
});

function handleMessage(nodeList: Array<INode>, edgeList: Array<IEdge>) {
  if (nodeList === undefined) return;
  const time1 = performance.now();
  // 分类
  const time00 = performance.now()
  const { regionMap, resourceMap } = handleFenLei(nodeList);
  const time0 = performance.now()
  console.log('=================================')
  console.log(`分类：花费${time0 - time00}毫秒`, regionMap, resourceMap);

  // console.log(resourceMap);

  // 按 region 分组，计算出每一类 region 下 value 平均值、最大值、最小值、中位值、总和
  const res1 = calcuFn1(regionMap);
  const time2 = performance.now();
  console.log(`任务1：花费${time2 - time1}毫秒`, res1);


  // 按 region 分组，计算每一年，每一类 region 下 value 平均值、最大值、最小值、中位值、总和
  const time11 = performance.now()
  const res2 = calcuFn2(regionMap);
  const time12 = performance.now()
  console.log(`任务2：花费${time12 - time11}毫秒`, res2);


  // 按 resource 分类，计算每一类 resource 下 value 平均值、最大值、最小值、中位值、总和
  const time3 = performance.now();
  const res3 = calcuFn3(resourceMap);
  const time4 = performance.now();
  console.log(`任务3：花费${time4 - time3}毫秒`, res3);


  // 找到整个数据集中，weight 最大值、最小值、中位值
  const time5 = performance.now();
  const res4 = calcuFn4(nodeList, edgeList);
  const time6 = performance.now();
  console.log(`任务4：花费${time6 - time5}毫秒`, res4);

}

// 分类
function handleFenLei(data: Array<INode>) {
  const regionMap: Map<string, INode[]> = new Map();
  const resourceMap: Map<string, INode[]> = new Map();
  // 每个类别排序
  data.forEach((item: INode) => {
    const { region, resource } = item;

    if (regionMap.has(region)) {
      regionMap.get(region)!.push(item);
    } else {
      regionMap.set(region, [item]);
    }

    if (resourceMap.has(resource)) {
      resourceMap.get(resource)!.push(item);
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
    const newArr = arr.toSorted((a, b) => a.value - b.value);
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

    item.total = arr.reduce((acc: number, curr: INode) => acc + curr.value, 0);
    item.average = item.total! / len;

    result.push(item);
  });

  return result;
}

//   按 region 分组，计算每一年， value 平均值、最大值、最小值、中位值、总和
function calcuFn2(regionMap: Map<string, INode[]>): IResult2[] {
  const result: IResult2[] = [];

  regionMap.forEach((arr, region) => {
    const res: IResult2 = {
      region,
      data: [],
    };

    // <年份： INode[]>
    const map: Map<number, INode[]> = new Map();
    // 按照年份分类
    arr.forEach((item) => {
      if (map.has(item.year)) {
        map.get(item.year)?.push(item);
      } else {
        map.set(item.year, [item]);
      }
    });

    map.forEach((arr, year) => {
      const r: {
        year: number;
        average: number;
        max: number;
        min: number;
        middle: number;
        total: number;
      } = {
        year,
        average: -999,
        max: -999,
        min: -999,
        middle: -999,
        total: -999,
      };
      arr.sort((a, b) => a.value - b.value);
      const len = arr.length;
      r.max = arr[len - 1].value;
      r.min = arr[0].value;
      r.total = arr.reduce((acc, curr) => acc + curr.value, 0);
      r.average = r.total / len;
      r.middle =
        len % 2 === 0
          ? (arr[len / 2].value + arr[len / 2 - 1].value) / 2
          : arr[(len - 1) / 2].value;

      res.data.push(r)
    });

    result.push(res)
  });

  return result
}

function calcuFn3(resourceMap: Map<string, INode[]>) {
  const result: Array<IResult3> = [];
  const newResourceMap: Map<string, INode[]> = new Map();

  resourceMap.forEach((arr, resource) => {
    const newArr = arr.toSorted((a, b) => a.value - b.value);
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

    item.total = arr.reduce((acc: number, curr: INode) => acc + curr.value, 0);
    item.average = item.total! / len;

    result.push(item);
  });

  return result;
}

// 找到整个数据集中，weight 最大值、最小值、中位值
function calcuFn4(nodeList: Array<INode>, edgeList: Array<IEdge>): IResult4 {
  const valueList: number[] = [];
  let len: number = 0;

  nodeList.forEach((item) => valueList.push(item.weight));

  edgeList.forEach((item) => valueList.push(Number(item.weight)));

  valueList.sort((a, b) => a - b);
  len = valueList.length;
  // console.log("valueList", valueList);
  // console.log("len", len);

  return {
    min: valueList[0],
    max: valueList[valueList.length - 1],
    middle:
      len % 2 === 0
        ? (valueList[len / 2] + valueList[len / 2 - 1]) / 2
        : valueList[(len - 1) / 2],
  };
}
