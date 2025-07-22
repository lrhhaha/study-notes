export interface IData {
  id: string;
  sim_name: string;
  name: string;
  region: string;
  resource: string;
  year: number;
  value: number;
  weight: number;
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
export interface {
  year: number;
  
}