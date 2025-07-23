import type {
  INode,
  IResult1,
  IResult3,
  IEdge,
  IResult4,
  IResult2,
} from "./types";
import {
  handleNodeList,
  calcuFn1,
  calcuFn2,
  calcuFn3,
  calcuFn4,
} from "./utils";

self.addEventListener("message", (event) => {
  handleMessage(event.data.nodeList, event.data.edgeList);
});

function handleMessage(nodeList: Array<INode>, edgeList: Array<IEdge>) {
  if (nodeList === undefined) return;
  const time1 = performance.now();
  // 分类
  const time00 = performance.now();
  const { regionMap, resourceMap } = handleNodeList(nodeList);
  const time0 = performance.now();
  console.log("=================================");
  console.log(`分类：花费${time0 - time00}毫秒`, regionMap, resourceMap);


  // 任务一：按 region 分组，计算出每一类 region 下 value 平均值、最大值、最小值、中位值、总和
  const res1 = calcuFn1(regionMap);
  const time2 = performance.now();
  console.log(`任务1：花费${time2 - time1}毫秒`, res1);

  // 任务二：按 region 分组，计算每一年，每一类 region 下 value 平均值、最大值、最小值、中位值、总和
  const time11 = performance.now();
  const res2 = calcuFn2(regionMap);
  const time12 = performance.now();
  console.log(`任务2：花费${time12 - time11}毫秒`, res2);

  // 任务三：按 resource 分类，计算每一类 resource 下 value 平均值、最大值、最小值、中位值、总和
  const time3 = performance.now();
  const res3 = calcuFn3(resourceMap);
  const time4 = performance.now();
  console.log(`任务3：花费${time4 - time3}毫秒`, res3);

  // 任务四：找到整个数据集中，weight 最大值、最小值、中位值
  const time5 = performance.now();
  const res4 = calcuFn4(nodeList, edgeList);
  const time6 = performance.now();
  console.log(`任务4：花费${time6 - time5}毫秒`, res4);
}

