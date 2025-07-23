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

const queue: Function[] = [];

function worker() {
  requestIdleCallback((idleDeadline) => {
    console.log("requestIdleCallback");
    while (queue.length && idleDeadline.timeRemaining() >= 2) {
      const fn = queue.shift();
      fn!();
      console.log("下一次够时间吗", idleDeadline.timeRemaining());
    }

    worker();
  });
}
worker();

export default function useIdleCallback(
  nodeList: Array<INode>,
  edgeList: Array<IEdge>
) {
  // 任务一
  const task1 = () => {
    const startTime = performance.now();
    const { regionMap } = handleNodeList(nodeList);
    const res = calcuFn1(regionMap);
    const endTime = performance.now();
    console.log(`任务一耗时${endTime - startTime}毫秒`, res);
  };

  // 任务二
  const task2 = () => {
    const startTime = performance.now();
    const { regionMap } = handleNodeList(nodeList);
    const res = calcuFn2(regionMap);
    const endTime = performance.now();
    console.log(`任务二耗时${endTime - startTime}毫秒`, res);
  };

  // 任务三
  const task3 = () => {
    const startTime = performance.now();
    const { resourceMap } = handleNodeList(nodeList);
    const res = calcuFn3(resourceMap);
    const endTime = performance.now();
    console.log(`任务三耗时${endTime - startTime}毫秒`, res);
  };

  // 任务四
  const task4 = () => {
    const startTime = performance.now();
    const res = calcuFn4(nodeList, edgeList);
    const endTime = performance.now();
    console.log(`任务四耗时${endTime - startTime}毫秒`, res);
  };

  pushTask(task1, task2, task3, task4);
}

function pushTask(...fns: Function[]) {
  queue.push(...fns);
}
