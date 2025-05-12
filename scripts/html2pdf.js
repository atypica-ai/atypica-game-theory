const puppeteer = require("puppeteer");

async function main() {
  // 启动浏览器
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 设置视口宽度为 1200px，高度自适应
  await page.setViewport({
    width: 1200,
    height: 800, // 初始高度，页面会根据内容自动调整
    deviceScaleFactor: 1,
  });

  // 导航到目标页面并等待页面加载完成
  await page.goto("http://localhost:3000/artifacts/report/bvgyDN4uuG2Fym9h/raw", {
    waitUntil: "networkidle0",
  });

  // 获取页面的实际高度以确保整个内容都能被渲染
  const bodyHeight = await page.evaluate(() => {
    return document.body.scrollHeight;
  });

  // 重新设置视口高度以匹配内容
  await page.setViewport({
    width: 1200,
    height: bodyHeight,
    deviceScaleFactor: 1,
  });

  // 生成PDF，使用自定义宽度而不是预设格式
  await page.pdf({
    path: "output.pdf",
    width: "1200px",
    height: bodyHeight + "px",
    printBackground: true, // 打印背景图形
    margin: { top: 0, right: 0, bottom: 0, left: 0 }, // 无边距
    preferCSSPageSize: true, // 优先使用CSS中定义的页面尺寸
  });

  await browser.close();
}

main();
