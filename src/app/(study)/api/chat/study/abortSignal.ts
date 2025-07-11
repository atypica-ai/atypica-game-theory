import { rootLogger } from "@/lib/logging";

export const createAbortSignals = (requestSignal: AbortSignal | null) => {
  throw new Error("Deprecated");
  // const abortSignal = req.signal;
  // 请求断了以后不终止，自己创建一个 controller 在 onError 里触发，或者收到用户中断的操作指令时候触发
  const abortController = new AbortController();
  requestSignal?.addEventListener("abort", () => {
    rootLogger.info(`StudyChat request aborted, do nothing, background working`);
    // abortController.abort();
  });
  const abortSignal = abortController.signal;

  // 给 StudyChat 的 streamText 用，先等其他的请求都 abort 最后再 abort StudyChat
  // 否则 StudyChat 提前中断会取消它后续调用的所有 promise，导致他们自己在调用 abortController.abort() 方法时失败
  const delayedAbortController = new AbortController();
  abortSignal.addEventListener("abort", () => {
    setTimeout(() => delayedAbortController.abort(), 1000);
  });
  const delayedAbortSignal = delayedAbortController.signal;

  return {
    abortSignal,
    delayedAbortSignal,
  };
};
