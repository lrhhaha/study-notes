export interface INode {
  id: string;
  sim_name: string;
  name: string;
  region: string;
  resource: string;
  year: number;
  value: number;
  weight: number;
}

export interface IEdge {
  weight: string;
  // [key: string]: string;
}

//   按 region 分组，计算出每一类 region 下 value 平均值、最大值、最小值、中位值、总和
export interface IResult1 {
  region: string;
  average: number;
  max: number;
  min: number;
  middle: number;
  total: number;
}


// 按 region 分组，计算每一年，每一类 region 下 value 平均值、最大值、最小值、中位值、总和
export interface IResult2 {
  region: string;
  data: {
    year: number;
    average: number;
    max: number;
    min: number;
    middle: number;
    total: number;
  }[]
}

//   按 resource 分类，计算每一类 resource 下 value 平均值、最大值、最小值、中位值、总和
export interface IResult3 {
  resource: string;
  average: number;
  max: number;
  min: number;
  middle: number;
  total: number;
}

//   找到整个数据集中，weight 最大值、最小值、中位值
export interface IResult4 {
  max: number;
  min: number;
  middle: number;
}