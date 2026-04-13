declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar;
    getLunar(): Lunar;
  }

  export class Lunar {
    getFestivals(): string[];
    getJieQi(): string | null;
    getDayInChinese(): string;
    getMonthInChinese(): string;
    getYearInGanZhi(): string;
    getYearShengXiao(): string;
  }
}
