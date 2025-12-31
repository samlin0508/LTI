import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as echarts from 'echarts/core';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { BarChart } from 'echarts/charts';
import { BrushComponent, GraphicComponent, GridComponent, LegendComponent, ToolboxComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ECharts, EChartsOption } from 'echarts';
import { ApiService } from './api.service';
import { BehaviorSubject, debounceTime, distinctUntilChanged, forkJoin, Observable } from 'rxjs';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule, LocationStrategy } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Dialog } from './dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { ClipboardModule } from '@angular/cdk/clipboard';

echarts.use([BarChart, GridComponent, CanvasRenderer, LegendComponent, TooltipComponent, BrushComponent, ToolboxComponent, GraphicComponent]);

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    NgxEchartsDirective,
    NgxEchartsDirective,
    MatSelectModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    ClipboardModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  providers: [
    provideEchartsCore({ echarts }),
  ]
})
export class App {
  baseUrl!: string;

  thisYear: number = new Date().getFullYear();

  dialog = inject(MatDialog);

  stockControl: FormControl = new FormControl("2887");
  entities: any[] = [];

  lastNYearsOfEpsYoyControl: FormControl = new FormControl(1);
  lastNYearsOfEpsYoy: any[] = [{
    id: 1,
    name: "最近2年"
  }, {
    id: 2,
    name: "最近3年"
  }, {
    id: 3,
    name: "最近4年"
  }, {
    id: 4,
    name: "最近5年"
  }];

  lastNYearsOfEpsVsDividendsControl: FormControl = new FormControl(9);
  lastNYearsOfEpsVsDividends: any[] = [{
    id: 1,
    name: "最近2年"
  }, {
    id: 2,
    name: "最近3年"
  }, {
    id: 4,
    name: "最近5年"
  }, {
    id: 9,
    name: "最近10年"
  }];

  stocksOfMonthlyEpsComparisonControl: FormControl = new FormControl(["2887", "2890"]);
  yearsOfMonthlyEpsComparisonControl: FormControl = new FormControl(this.thisYear);
  yearsOfMonthlyEpsComparison: any[] = [];

  stocksOfYearlyEpsComparisonControl: FormControl = new FormControl(["2887", "2890"]);
  yearsOfYearlyEpsComparisonControl: FormControl = new FormControl([this.thisYear, this.thisYear - 1]);

  epsYoyParamStream: BehaviorSubject<string> = new BehaviorSubject<string>("");
  epsYoyParamStream$: Observable<string> = this.epsYoyParamStream.asObservable();

  monthlyEpsComparisonParamStream: BehaviorSubject<any> = new BehaviorSubject<any>({});
  monthlyEpsComparisonParamStream$: Observable<any> = this.monthlyEpsComparisonParamStream.asObservable();

  yearlyEpsComparisonParamStream: BehaviorSubject<any> = new BehaviorSubject<any>({});
  yearlyEpsComparisonParamStream$: Observable<any> = this.yearlyEpsComparisonParamStream.asObservable();

  epsYoyBarChart!: ECharts;
  optionsEpsYoy!: EChartsOption;

  epsVsDividendsBarChart!: ECharts;
  optionsEpsVsDividends!: EChartsOption;

  monthlyEpsComparisonBarChart!: ECharts;
  optionsMonthlyEpsComparison!: EChartsOption;

  yearlyEpsComparisonBarChart!: ECharts;
  optionsYearlyEpsComparison!: EChartsOption;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private title: Title,
    private locationStrategy: LocationStrategy
  ) {
    this.baseUrl = `${window.location.origin}${locationStrategy.getBaseHref()}`;
  }

  ngOnInit(): void {
    this.initYearsOfMonthlyEpsComparison(10);

    this.renderEpsYoy([]);
    this.renderEpsVsDividends([], []);
    this.renderMonthlyEpsComparison([]);
    this.renderYearlyEpsComparison([]);

    // 方法一
    // forkJoin([
    //   this.apiService.getEntities(),
    //   this.paramStream$
    //     .pipe(
    //       debounceTime(50),
    //       distinctUntilChanged()
    //     )
    // ])
    // .subscribe(x => {
    //   this.entities = x[0];
    //   this.stockControl.setValue(x[1]);
    //   this.fetch();
    // });

    // 方法二
    this.apiService.getEntities()
      .subscribe(x => {
        this.entities = x
          .sort((a, b) => {
            if (a.id > b.id) {
              return 1;
            }

            if (a.id < b.id) {
              return -1;
            }

            return 0;
          });

        this.epsYoyParamStream$
          .pipe(
            debounceTime(50),
            distinctUntilChanged()
          )
          .subscribe(y => {
            this.stockControl.setValue(y);
            this.fetch();
          });

        this.monthlyEpsComparisonParamStream$
          .pipe(
            debounceTime(50),
            distinctUntilChanged()
          )
          .subscribe(y => {
            this.yearsOfMonthlyEpsComparisonControl.setValue(y.year);
            this.stocksOfMonthlyEpsComparisonControl.setValue(y.ids);
            this.onMonthlyEpsComparisonClick(null);
          });

        this.yearlyEpsComparisonParamStream$
          .pipe(
            debounceTime(50),
            distinctUntilChanged()
          )
          .subscribe(y => {
            this.yearsOfYearlyEpsComparisonControl.setValue(y.years);
            this.stocksOfYearlyEpsComparisonControl.setValue(y.ids);
            this.onYearlyEpsComparisonClick(null);
          });
      });

    this.epsYoyParamStream.next("2887");

    this.monthlyEpsComparisonParamStream.next({
      year: this.thisYear,
      ids: ["2887", "2890"]
    });

    this.yearlyEpsComparisonParamStream.next({
      years: [this.thisYear, this.thisYear - 1],
      ids: ["2887", "2890"]
    });

    this.route.queryParamMap.subscribe(params => {
      let id: any = params.get('id');
      let ids: any = params.get('ids');
      let year: any = params.get('year');
      let years: any = params.get('years');

      if (id) {
        this.epsYoyParamStream.next(id);
      }

      if(ids && year) {
        this.monthlyEpsComparisonParamStream.next({
          year: +year,
          ids: ids.split(",")
        });
      }

      if(ids && years) {
        this.yearlyEpsComparisonParamStream.next({
          years: (years.split(",") as string[]).map(x => +x),
          ids: ids.split(",")
        });
      }
    });

    // 方法一
    // setTimeout(
    //   () => {
    //     this.paramStream.complete();
    //   },
    //   100
    // );
  }

  initYearsOfMonthlyEpsComparison(howManyYears: number): void {
    for(let i = this.thisYear ; i > this.thisYear - howManyYears ; i--) {
      this.yearsOfMonthlyEpsComparison.push({
        id: i,
        name: i.toString()
      });
    }
  }

  getEntityName(id: string): string {
    let entity = this.entities.filter(x => x.id === id)[0];
    return `${entity?.id ?? ""} ${entity?.name ?? ""}`;
  }

  fetch(): void {
    this.setTitle();

    forkJoin([
      this.apiService.getEps(this.stockControl.value),
      this.apiService.getDividends(this.stockControl.value)
    ])
    .subscribe({
      next: x => {
        this.renderEpsYoy(x[0]);
        this.renderEpsVsDividends(x[0], x[1]);
      },
      error: error => {
        if (error.status === 404) {
          this.openDialog({
            title: '請求發生錯誤',
            // content: `⚠️ 無此公司代號(${this.stockControl.value})的數據。`
            content: `⚠️ ${error.url}`
          });
        }
      }
    });
  }

  onStockSelectionChange(event: any) {
    this.fetch();
  }

  onLastNYearsOfEpsYoySelectionChange(event: any) {
    this.fetch();
  }

  onLastNYearsOfEpsVsDividendsSelectionChange(event: any) {
    this.fetch();
  }

  onMonthlyEpsComparisonClick(event: any) {
    let stocks: string[] = this.stocksOfMonthlyEpsComparisonControl.value;

    if(stocks.length === 0) {
      this.openDialog({
        title: '查詢條件不足',
        content: `⚠️ 請選擇要比較的公司代號。`
      });
    }

    forkJoin(stocks.map(x => this.apiService.getEps(x)))
      .subscribe({
        next: x => {
          this.renderMonthlyEpsComparison(x);
        },
        error: error => {
          if (error.status === 404) {
            this.openDialog({
              title: '請求發生錯誤',
              content: `⚠️ ${error.url}`
            });
          }
        }
      });
  }

  onYearlyEpsComparisonClick(event: any) {
    let stocks: string[] = this.stocksOfYearlyEpsComparisonControl.value;

    if(stocks.length === 0) {
      this.openDialog({
        title: '查詢條件不足',
        content: `⚠️ 請選擇要比較的公司代號。`
      });
    }

    forkJoin(stocks.map(x => this.apiService.getEps(x)))
      .subscribe({
        next: x => {
          this.renderYearlyEpsComparison(x);
        },
        error: error => {
          if (error.status === 404) {
            this.openDialog({
              title: '請求發生錯誤',
              content: `⚠️ ${error.url}`
            });
          }
        }
      });
  }

  setTitle(): void {
    let entity = this.entities.filter(y => y.id === this.stockControl.value)[0];
    this.title.setTitle(`${entity?.id ?? ""} ${entity?.name ?? ""} EPS 趨勢分析`);
  }

  onEpsYoyBarChartInit(echartsIntance: any) {
    this.epsYoyBarChart = echartsIntance;
  }

  onEpsVsDividendsBarChartInit(echartsIntance: any) {
    this.epsVsDividendsBarChart = echartsIntance;
  }

  onMonthlyEpsComparisonBarChartInit(echartsIntance: any) {
    this.monthlyEpsComparisonBarChart = echartsIntance;
  }

  onYearlyEpsComparisonBarChartInit(echartsIntance: any) {
    this.yearlyEpsComparisonBarChart = echartsIntance;
  }

  renderEpsYoy(data: any[]): void {
    let xAxisData: string[] = data
      .filter(x => x.year === this.thisYear - this.lastNYearsOfEpsYoyControl.value)
      .sort((a, b) => {
        if (a.month > b.month) {
          return 1;
        }

        if (a.month < b.month) {
          return -1;
        }

        return 0;
      })
      .map(x => x.month.toString().padStart(2, '0'));

    let epsOfNYears: number[][] = [];

    for (let i = this.lastNYearsOfEpsYoyControl.value; i >= 0; i--) {
      let yearN = i > 0 ? this.thisYear - i : this.thisYear;

      epsOfNYears.push(
        data
          .filter(x => x.year === yearN)
          .sort((a, b) => {
            if (a.month > b.month) {
              return 1;
            }

            if (a.month < b.month) {
              return -1;
            }

            return 0;
          })
          .map(x => x.eps_month)
      );
    }

    var emphasisStyle = {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)'
      }
    };

    this.optionsEpsYoy = {
      grid: {
        left: 0,
        right: 0
      },
      legend: {
        data: epsOfNYears.map((value, index) => (this.thisYear - (this.lastNYearsOfEpsYoyControl.value - index)).toString()),
      },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '月',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      // graphic: {
      //   elements: [{
      //     type: 'image',
      //     style: {
      //       image: 'cover.png',
      //       opacity: 0.1,
      //     },
      //     left: 0,
      //     top: 0,
      //     scaleX: 1,
      //     scaleY: 1
      //   }]
      // },
      series:
        epsOfNYears
          .map((value, index) => {
            let yearN = (this.thisYear - (this.lastNYearsOfEpsYoyControl.value - index)).toString();

            return {
              name: yearN,
              type: 'bar',
              stack: yearN,
              emphasis: emphasisStyle,
              label: {
                show: true
              },
              itemStyle: {
                color: +yearN === this.thisYear ? this.entities.filter(x => x.id === this.stockControl.value)[0]?.color : undefined,
              },
              data: value
            };
          })
    };

    if (this.epsYoyBarChart) {
      this.epsYoyBarChart.clear();
      this.epsYoyBarChart.setOption(this.optionsEpsYoy);
    }
  }

  renderEpsVsDividends(
    dataEps: any[],
    dataDividends: any[]
  ): void {
    let xAxisData: number[] = dataEps
      .filter(x => x.year >= this.thisYear - this.lastNYearsOfEpsVsDividendsControl.value && x.month === 12)
      .sort((a, b) => {
        if (a.year > b.year) {
          return 1;
        }

        if (a.year < b.year) {
          return -1;
        }

        return 0;
      })
      .map(x => x.year);

    let eps: number[] = dataEps
      .filter(x => x.year >= this.thisYear - this.lastNYearsOfEpsVsDividendsControl.value && x.year < this.thisYear && x.month === 12)
      .sort((a, b) => {
        if (a.year > b.year) {
          return 1;
        }

        if (a.year < b.year) {
          return -1;
        }

        return 0;
      })
      .map(x => x.eps);

    eps.push(
      dataEps.filter(x => x.year === this.thisYear && x.eps !== null)
        .sort((a, b) => {
          if (a.month < b.month) {
            return 1;
          }

          if (a.month > b.month) {
            return -1;
          }

          return 0;
        })[0]?.eps
    );

    let cashDividends: (number | null)[] = [];

    let stockDividends: (number | null)[] = [];

    for (let i = 0; i < xAxisData.length; i++) {
      cashDividends.push(dataDividends.filter(x => x.year === xAxisData[i])[0]?.dividend_cash);
      stockDividends.push(dataDividends.filter(x => x.year === xAxisData[i])[0]?.dividend_stock);
    }

    var emphasisStyle = {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)'
      }
    };

    this.optionsEpsVsDividends = {
      grid: {
        left: 0,
        right: 0
      },
      legend: {
        data: ["EPS", "現金股利", "股票股利"],
      },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '年',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      // graphic: {
      //   elements: [{
      //     type: 'text',
      //     style: {
      //         text: 'Undefined - 雜記',
      //         font: '25px sans-serif',
      //         fill: '#ccc',
      //         opacity: 0.7
      //     },
      //     left: 0,
      //     top: 0,
      //   }]
      // },
      // graphic: {
      //   elements: [{
      //     type: 'image',
      //     style: {
      //       image: 'cover.png',
      //       opacity: 0.1,
      //     },
      //     left: 0,
      //     top: 0,
      //     scaleX: 1,
      //     scaleY: 1
      //   }]
      // },
      series: [
        {
          name: "EPS",
          type: 'bar',
          stack: 'EPS',
          emphasis: emphasisStyle,
          label: {
            show: true,
            formatter: (params) => {
              let index = xAxisData.indexOf(+params.name);
              let cash = cashDividends[index] ?? 0;
              let stock = stockDividends[index] ?? 0;
              let eps = params.value ? +params.value! : 0;
              let payoutRatio = 0;

              if (eps === 0) {
                payoutRatio = 0;
              } else {
                payoutRatio = Math.round(((cash + stock) / eps) * 100);
              }

              return `${params.value}\n(${payoutRatio}%)`;
            }
          },
          itemStyle: {
            color: this.entities.filter(x => x.id === this.stockControl.value)[0]?.color,
          },
          data: eps
        },
        {
          name: "現金股利",
          type: 'bar',
          stack: 'Dividends',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          itemStyle: {
            color: "burlywood"
          },
          data: cashDividends
        },
        {
          name: "股票股利",
          type: 'bar',
          stack: 'Dividends',
          emphasis: emphasisStyle,
          label: {
            show: true
          },
          itemStyle: {
            color: "#4bbebe"
          },
          data: stockDividends
        }
      ]
    };

    if (this.epsVsDividendsBarChart) {
      this.epsVsDividendsBarChart.clear();
      this.epsVsDividendsBarChart.setOption(this.optionsEpsVsDividends);
    }
  }

  renderMonthlyEpsComparison(data: any[][]): void {
    let stocks: string[] = this.stocksOfMonthlyEpsComparisonControl.value;

    let xAxisData: string[] = data.length === 0 ? [] : data[0]
      .filter(x => x.year === +this.yearsOfMonthlyEpsComparisonControl.value)
      .sort((a, b) => {
        if (a.month > b.month) {
          return 1;
        }

        if (a.month < b.month) {
          return -1;
        }

        return 0;
      })
      .map(x => x.month.toString().padStart(2, '0'));

    let epsOfStocks: number[][] = [];

    for (let i = 0; i < data.length; i++) {
      epsOfStocks.push(
        data[i]
          .filter(x => x.year === +this.yearsOfMonthlyEpsComparisonControl.value)
          .sort((a, b) => {
            if (a.month > b.month) {
              return 1;
            }

            if (a.month < b.month) {
              return -1;
            }

            return 0;
          })
          .map(x => x.eps_month)
      );
    }

    var emphasisStyle = {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)'
      }
    };

    this.optionsMonthlyEpsComparison = {
      grid: {
        left: 0,
        right: 0
      },
      legend: {
        data: epsOfStocks.length === 0 ? [] : stocks
          .map(x => {
            let entity = this.entities.filter(y => y.id === x)[0];

            return `${entity?.id} ${entity?.name}`;
          }),
      },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '月',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      // graphic: {
      //   elements: [{
      //     type: 'image',
      //     style: {
      //       image: 'cover.png',
      //       opacity: 0.1,
      //     },
      //     left: 0,
      //     top: 0,
      //     scaleX: 1,
      //     scaleY: 1
      //   }]
      // },
      series:
        epsOfStocks
          .map((value, index) => {
            let entity = this.entities.filter(x => x.id === stocks[index])[0];

            return {
              name: `${entity.id} ${entity.name}`,
              type: 'bar',
              stack: `${entity.id} ${entity.name}`,
              emphasis: emphasisStyle,
              label: {
                show: true
              },
              itemStyle: {
                color: entity.color,
              },
              data: value
            };
          })
    };

    if (this.monthlyEpsComparisonBarChart) {
      this.monthlyEpsComparisonBarChart.clear();
      this.monthlyEpsComparisonBarChart.setOption(this.optionsMonthlyEpsComparison);
    }
  }

  renderYearlyEpsComparison(data: any[][]): void {
    let years: number[] = this.yearsOfYearlyEpsComparisonControl.value;
    let stocks: string[] = this.stocksOfYearlyEpsComparisonControl.value;

    let xAxisData: string[] = years
      .sort((a, b) => {
        if (a > b) {
          return 1;
        }

        if (a < b) {
          return -1;
        }

        return 0;
      })
      .map(x => x.toString());

    let epsOfStocks: number[][] = [];

    for (let i = 0; i < data.length; i++) {
      let temp = data[i].filter(x => years.includes(x.year) && x.month === 12);

      if(years.includes(this.thisYear)) {
        temp = temp.filter(x => x.year !== this.thisYear);
      }

      epsOfStocks.push(
        temp
          .sort((a, b) => {
            if (a.year > b.year) {
              return 1;
            }

            if (a.year < b.year) {
              return -1;
            }

            return 0;
          })
          .map(x => x.eps)
      );

      if(years.includes(this.thisYear)) {
        epsOfStocks[i].push(
          data[i].filter(x => x.year === this.thisYear && x.eps !== null)
            .sort((a, b) => {
              if (a.month < b.month) {
                return 1;
              }

              if (a.month > b.month) {
                return -1;
              }

              return 0;
            })[0]?.eps
        );
      }
    }

    var emphasisStyle = {
      itemStyle: {
        shadowBlur: 10,
        shadowColor: 'rgba(0,0,0,0.3)'
      }
    };

    this.optionsYearlyEpsComparison = {
      grid: {
        left: 0,
        right: 0
      },
      legend: {
        data: epsOfStocks.length === 0 ? [] : stocks
          .map(x => {
            let entity = this.entities.filter(y => y.id === x)[0];

            return `${entity?.id} ${entity?.name}`;
          }),
      },
      tooltip: {},
      xAxis: {
        data: xAxisData,
        name: '年',
        axisLine: { onZero: true },
        splitLine: { show: false },
        splitArea: { show: false }
      },
      yAxis: {},
      // graphic: {
      //   elements: [{
      //     type: 'text',
      //     style: {
      //         text: 'Undefined - 雜記',
      //         font: '25px sans-serif',
      //         fill: '#ccc',
      //         opacity: 0.7
      //     },
      //     left: 0,
      //     top: 0,
      //   }]
      // },
      // graphic: {
      //   elements: [{
      //     type: 'image',
      //     style: {
      //       image: 'cover.png',
      //       opacity: 0.1,
      //     },
      //     left: 0,
      //     top: 0,
      //     scaleX: 1,
      //     scaleY: 1
      //   }]
      // },
      series:
        epsOfStocks
          .map((value, index) => {
            let entity = this.entities.filter(x => x.id === stocks[index])[0];

            return {
              name: `${entity.id} ${entity.name}`,
              type: 'bar',
              stack: `${entity.id} ${entity.name}`,
              emphasis: emphasisStyle,
              label: {
                show: true
              },
              itemStyle: {
                color: entity.color,
              },
              data: value
            };
          })
    };

    if (this.yearlyEpsComparisonBarChart) {
      this.yearlyEpsComparisonBarChart.clear();
      this.yearlyEpsComparisonBarChart.setOption(this.optionsYearlyEpsComparison);
    }
  }

  openDialog(data: any) {
    this.dialog.open(
      Dialog,
      {
        data: data
      }
    );
  }
}
