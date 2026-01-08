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
  "Study Plan Confirmed": {
    userChatId: number;
  };
  /**
   * 报告或播客生成后上报
   */
  "Study Session Completed": {
    userChatId: number;
    reportToken?: string;
    podcastToken?: string;
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
  /**
   * 开始导入人物
   * 创建 PersonaImport 后上报
   */
  "Persona Import Started": {
    personaImportId: number;
    fileSize: number;
  };
  /**
   * 人物导入完成
   * 处理完成并生成 Persona 后上报
   */
  "Persona Import Completed": {
    personaImportId: number;
  };
  /**
   * Sage 添加或更新数据源
   * 创建时添加 source 或创建后添加 source 都上报
   */
  "Sage Source Updated": {
    sageId?: number; // Optional: not available during creation
    sourcesCount: number;
  };
  /**
   * Sage 创建成功
   * 创建 Sage 后上报
   */
  "Sage Created": {
    sageId: number;
    sourcesCount: number;
  };
  /**
   * 分享 Sage
   * 分享专家公共主页时上报
   */
  "Sage Profile Shared": {
    intent: "share" | "visit";
    url: string;
  };
  /**
   * 访谈项目简介更新
   * 在创建访谈项目界面，一旦开始输入就上报
   */
  "Interview Brief Updated": {
    brief: string;
  };
  /**
   * 访谈项目创建成功
   * 创建 Interview Project 后上报
   */
  "Interview Project Created": {
    projectId: number;
    hasPresetQuestions: boolean;
  };
  /**
   * 分享访谈项目邀请链接
   * 复制访谈邀请链接时上报
   */
  "Interview Invitation Shared": {
    projectId: number;
  };
};
