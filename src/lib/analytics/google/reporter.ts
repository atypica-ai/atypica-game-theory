"use server";

import { BetaAnalyticsDataClient } from "@google-analytics/data";

export interface PageViewsReport {
  pagePath: string;
  pageViews: number;
  sessions: number;
  users: number;
}

export type PageType = 'study' | 'report';

export interface PageTypeFilter {
  type: PageType;
  pathPattern: RegExp;
  description: string;
}

export class GoogleAnalyticsReporter {
  private client: BetaAnalyticsDataClient;
  private propertyId: string;

  // 支持的页面类型定义
  private static readonly PAGE_TYPE_FILTERS: Record<PageType, PageTypeFilter> = {
    study: {
      type: 'study',
      pathPattern: /^\/study\/[^\/]+\/share\/?$/,
      description: 'Study share pages'
    },
    report: {
      type: 'report', 
      pathPattern: /^\/artifacts\/report\/[^\/]+\/share\/?$/,
      description: 'Report share pages'
    }
  };

  constructor() {
    // 初始化 Google Analytics Data API 客户端
    this.client = new BetaAnalyticsDataClient({
      // 如果设置了 GOOGLE_APPLICATION_CREDENTIALS 环境变量，会自动使用服务账号认证
      // 或者可以直接传入 keyFilename 或 credentials
      // credentials: JSON.parse(process.env.GOOGLE_VERTEX_AI_APPLICATION_CREDENTIALS!),
      credentials: {
        client_email: process.env.GOOGLE_VERTEX_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_VERTEX_PRIVATE_KEY,
      },
    });

    // 从环境变量获取 GA4 Property ID
    this.propertyId = process.env.GA4_PROPERTY_ID || "";

    if (!this.propertyId) {
      throw new Error("请在环境变量中设置 GA4_PROPERTY_ID");
    }
  }

  /**
   * 通用的 share 页面查询方法，支持多种页面类型
   * @param pageTypes 要查询的页面类型数组，例如 ['study', 'report']
   * @param startDate 开始日期，格式 'YYYY-MM-DD'
   * @param endDate 结束日期，格式 'YYYY-MM-DD'
   */
  async getSharePagesViews(
    pageTypes: PageType[] = ['study', 'report'],
    startDate: string = "30daysAgo",
    endDate: string = "today",
  ): Promise<PageViewsReport[]> {
    try {
      // 构建 GA4 过滤器，查询包含相关路径的页面
      const filterConditions = pageTypes.map(type => {
        const basePattern = type === 'study' ? '/study/' : '/artifacts/report/';
        return {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "CONTAINS" as const,
              value: basePattern,
            },
          },
        };
      });

      // 使用 OR 条件组合多个过滤器
      const dimensionFilter = filterConditions.length === 1 
        ? filterConditions[0]
        : {
            orGroup: {
              expressions: filterConditions
            }
          };

      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" }, // 页面浏览量
          { name: "sessions" }, // 会话数
          { name: "activeUsers" }, // 活跃用户数
        ],
        dimensionFilter,
        // 按页面浏览量排序
        orderBys: [
          {
            metric: {
              metricName: "screenPageViews",
            },
            desc: true,
          },
        ],
        // 限制返回结果数量
        limit: 100,
      });

      const reports: PageViewsReport[] = [];

      if (response.rows) {
        for (const row of response.rows) {
          const pagePath = row.dimensionValues![0].value!;
          const pageViews = parseInt(row.metricValues![0].value!);
          const sessions = parseInt(row.metricValues![1].value!);
          const users = parseInt(row.metricValues![2].value!);

          // 使用正则表达式精确匹配页面路径
          const matchesAnyType = pageTypes.some(type => {
            const filter = GoogleAnalyticsReporter.PAGE_TYPE_FILTERS[type];
            return filter.pathPattern.test(pagePath);
          });

          if (matchesAnyType) {
            reports.push({
              pagePath,
              pageViews,
              sessions,
              users,
            });
          }
        }
      }

      return reports;
    } catch (error) {
      console.error("获取 Google Analytics 数据时出错:", error);
      throw error;
    }
  }

  /**
   * 获取指定页面路径模式的浏览数据 (向后兼容方法)
   * @param pathPattern 页面路径模式，例如 '/study/xxx/share/'
   * @param startDate 开始日期，格式 'YYYY-MM-DD'
   * @param endDate 结束日期，格式 'YYYY-MM-DD'
   */
  async getPageViews(
    pathPattern: string,
    startDate: string = "30daysAgo",
    endDate: string = "today",
  ): Promise<PageViewsReport[]> {
    // 使用新的通用方法，仅查询 study 类型
    return this.getSharePagesViews(['study'], startDate, endDate);
  }

  /**
   * 获取特定 study token 对应的 share 页面浏览数据
   * @param studyToken study token，例如 'abc123'
   * @param startDate 开始日期，格式 'YYYY-MM-DD'
   * @param endDate 结束日期，格式 'YYYY-MM-DD'
   */
  async getStudySharePageViews(
    studyToken: string,
    startDate: string = "30daysAgo",
    endDate: string = "today",
  ): Promise<PageViewsReport | null> {
    try {
      const targetPath = `/study/${studyToken}/share`;
      
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" }, // 页面浏览量
          { name: "sessions" }, // 会话数
          { name: "activeUsers" }, // 活跃用户数
        ],
        // 精确匹配特定的 study share 页面
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "EXACT",
              value: targetPath,
            },
          },
        },
      });

      if (response.rows && response.rows.length > 0) {
        const row = response.rows[0];
        const pagePath = row.dimensionValues![0].value!;
        const pageViews = parseInt(row.metricValues![0].value!);
        const sessions = parseInt(row.metricValues![1].value!);
        const users = parseInt(row.metricValues![2].value!);

        return {
          pagePath,
          pageViews,
          sessions,
          users,
        };
      }

      return null;
    } catch (error) {
      console.error("获取 study share 页面数据时出错:", error);
      throw error;
    }
  }

  /**
   * 获取特定 report token 对应的 share 页面浏览数据
   * @param reportToken report token，例如 'XdUaA9mpwbEcLmxa'
   * @param startDate 开始日期，格式 'YYYY-MM-DD'
   * @param endDate 结束日期，格式 'YYYY-MM-DD'
   */
  async getReportSharePageViews(
    reportToken: string,
    startDate: string = "30daysAgo",
    endDate: string = "today",
  ): Promise<PageViewsReport | null> {
    try {
      const targetPath = `/artifacts/report/${reportToken}/share`;
      
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
        metrics: [
          { name: "screenPageViews" }, // 页面浏览量
          { name: "sessions" }, // 会话数
          { name: "activeUsers" }, // 活跃用户数
        ],
        // 精确匹配特定的 report share 页面
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "EXACT",
              value: targetPath,
            },
          },
        },
      });

      if (response.rows && response.rows.length > 0) {
        const row = response.rows[0];
        const pagePath = row.dimensionValues![0].value!;
        const pageViews = parseInt(row.metricValues![0].value!);
        const sessions = parseInt(row.metricValues![1].value!);
        const users = parseInt(row.metricValues![2].value!);

        return {
          pagePath,
          pageViews,
          sessions,
          users,
        };
      }

      return null;
    } catch (error) {
      console.error("获取 report share 页面数据时出错:", error);
      throw error;
    }
  }

  /**
   * 获取所有 report share 页面浏览数据 (向后兼容方法)
   * @param startDate 开始日期，格式 'YYYY-MM-DD'
   * @param endDate 结束日期，格式 'YYYY-MM-DD'
   */
  async getReportSharePagesViews(
    startDate: string = "30daysAgo",
    endDate: string = "today",
  ): Promise<PageViewsReport[]> {
    // 使用新的通用方法，仅查询 report 类型
    return this.getSharePagesViews(['report'], startDate, endDate);
  }

  /**
   * 获取总体统计数据
   */
  async getTotalStats(
    startDate: string = "30daysAgo",
    endDate: string = "today",
  ): Promise<{ totalPageViews: number; totalSessions: number; totalUsers: number }> {
    try {
      const [response] = await this.client.runReport({
        property: `properties/${this.propertyId}`,
        dateRanges: [
          {
            startDate,
            endDate,
          },
        ],
        metrics: [{ name: "screenPageViews" }, { name: "sessions" }, { name: "activeUsers" }],
        dimensionFilter: {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "CONTAINS",
              value: "/study/",
            },
          },
        },
      });

      let totalPageViews = 0;
      let totalSessions = 0;
      let totalUsers = 0;

      if (response.rows && response.rows.length > 0) {
        totalPageViews = parseInt(response.rows[0].metricValues![0].value!);
        totalSessions = parseInt(response.rows[0].metricValues![1].value!);
        totalUsers = parseInt(response.rows[0].metricValues![2].value!);
      }

      return { totalPageViews, totalSessions, totalUsers };
    } catch (error) {
      console.error("获取总体统计数据时出错:", error);
      throw error;
    }
  }
}