import { ProductName } from "@/app/payment/data";
import { UserLastLogin, UserOnboardingData } from "@/prisma/client";

export type TAnalyticsEvent = {
  "Signed Up": { email: string };
  /**
   *  在 recordAndTrackLastLogin 方法里后端上报，所有登录都会调用
   */
  "Signed In": UserLastLogin;
  // "Onboarding Started": undefined; // 不需要，等价于 Page View (url = /auth/onboarding)
  "Onboarding Step Updated": UserOnboardingData;
  "Onboarding Completed": UserOnboardingData;
  /**
   * 进入新建研究页面
   * 在 /newstudy 页面加载时上报
   */
  "New Study Viewed": undefined;
  /**
   * 在发起研究界面，一旦开始输入就上报
   * @param interview: 是否使用 newstudy interview
   */
  "Study Brief Updated": {
    brief: string;
    interview?: boolean;
  };
  /**
   * 新的研究创建后上报
   * @param userChatToken: 通过 token 来关联后续事件
   * @param studyType: 研究类型，常规研究、产品研发、快速洞察、等
   * @param attachments: 附件数量
   * @param references: 参考研究的数量
   */
  "Study Session Started": {
    userChatId: number;
    studyType: string;
    brief: string;
    interview?: boolean;
    attachments?: number;
    references?: number;
  };
  /**
   * 报告或播客生成后上报
   */
  "Study Session Completed": {
    userChatId: number;
  };
  /**
   * 点击或者复制了回放/报告/播客的分享链接，或者下载
   * @param url: 回放/报告/播客的链接
   * @param intent: 分享(复制链接)、打开链接访问、导出下载
   */
  "Study Artifact Exported": {
    intent: "share" | "visit" | "download";
    type: "replay" | "report" | "podcast";
    url: string;
  };
  "Study Feedback Submitted": {
    userChatId: number;
    rating: "useful" | "not_useful";
  };
  /**
   * 查看 pricing 页面，打开或者切换 tab 的时候上报
   */
  "Product List Viewed": {
    category: "organization" | "individual" | "unlimited";
  };
  /**
   * 查看具体价格，点击了购买弹出框的时候上报
   */
  "Product Viewed": {
    name?: ProductName;
    currency: "USD" | "CNY";
  };
  /**
   * 创建 payment record 以后调用, createPaymentRecord 方法里
   */
  "Checkout Started": {
    paymentRecordId: number;
    currency: "USD" | "CNY";
    price: number;
    productName?: ProductName;
    // products: { name: ProductName; price: number }[];
  };
  /**
   * 支付成功以后上报
   * @param renew: 是否续费
   */
  "Order Completed": {
    paymentRecordId: number;
    currency: "USD" | "CNY";
    price: number;
    productName?: ProductName;
    renew?: boolean;
    // products: { name: ProductName; price: number }[];
  };
  /**
   * 进入创建知识库页面
   * 在 /sage/create 页面加载时上报
   */
  "New Sage Viewed": undefined;
  /**
   * 进入创建访谈项目页面
   * 在 /interview/projects/new 页面加载时上报
   */
  "New Interview Viewed": undefined;
  /**
   * 进入导入人设页面
   * 在 /persona 页面加载时上报
   */
  "New Persona Viewed": undefined;
};
