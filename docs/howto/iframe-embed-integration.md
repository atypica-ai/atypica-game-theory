# iframe 嵌入交互文档

## 相关文件

- `src/app/(system)/embed/Embed.tsx` - 核心组件，处理 postMessage 通信
- `src/app/(open)/docs/embed/page.tsx` - 在线文档页面（`/docs/embed`）
- `docs/howto/iframe-embed-integration.md` - 本文档
- `public/embed/test.html` - 测试页面
- `src/app/api/team/members/[userId]/impersonation/route.ts` - 生成 impersonation token API

## 概述

本文档说明如何将 Atypica LLM 应用嵌入到第三方产品中，并通过 postMessage API 进行双向通信。

## 快速开始

### 1. 嵌入 iframe

```html
<iframe
  id="atypica-iframe"
  src="https://atypica.musedam.cc/auth/impersonation-login?token=xxxxxx"
  width="100%"
  height="800px"
  frameborder="0"
>
</iframe>
```

### 2. 监听消息

```javascript
window.addEventListener("message", function (event) {
  if (event.data.source !== "atypica") {
    return; // 忽略非 Atypica 消息
  }

  console.log("收到消息:", event.data);
  // 处理消息...
});
```

### 3. 发送消息

```javascript
const iframe = document.getElementById("atypica-iframe");
iframe.contentWindow.postMessage(
  {
    target: "atypica",
    type: "check_auth",
    timestamp: new Date().toISOString(),
  },
  "*",
);
```

## 消息协议

所有消息都使用 JSON 格式，包含以下基本字段：

| 字段        | 类型   | 必需     | 说明                         |
| ----------- | ------ | -------- | ---------------------------- |
| `source`    | string | 是(响应) | 消息来源，固定值 `"atypica"` |
| `target`    | string | 是(请求) | 消息目标，固定值 `"atypica"` |
| `type`      | string | 是       | 消息类型                     |
| `timestamp` | string | 是       | ISO 8601 格式的时间戳        |

## 支持的消息类型

### 父窗口 → 子窗口 (请求)

#### 1. 检查认证状态

```javascript
{
  target: "atypica",
  type: "check_auth",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

#### 2. 执行动作

**获取分析师报告:**

```javascript
{
  target: "atypica",
  type: "action",
  action: "fetchAnalystReportsOfStudyUserChat",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

**创建研究对话:**

```javascript
{
  target: "atypica",
  type: "action",
  action: "createStudyUserChat",
  args: {
    content: "请分析一下苹果公司的最新财报"
  },
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

### 子窗口 → 父窗口 (响应)

#### 1. URL 变化通知

当子窗口的 URL 发生变化时自动发送：

```javascript
{
  source: "atypica",
  type: "href",
  href: "https://atypica.musedam.cc/study/xxx",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

#### 2. 认证状态响应

```javascript
{
  source: "atypica",
  type: "auth_status",
  authenticated: true,
  user: {
    email: "user@example.com",
  },
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

#### 3. 动作执行结果

**获取分析师报告结果:**

```javascript
{
  source: "atypica",
  type: "action_result",
  action: "fetchAnalystReportsOfStudyUserChat",
  result: [
    {
      token: "report-token-1",
      onePageHtml: "完整的报告 html"
    }
  ],
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

**创建研究对话结果:**

```javascript
{
  source: "atypica",
  type: "action_result",
  action: "createStudyUserChat",
  result: {
    token: "study-chat-token-123",
    id: "chat-id-456",
    // 其他对话数据...
  },
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

#### 4. 动作执行错误

```javascript
{
  source: "atypica",
  type: "action_error",
  action: "createStudyUserChat",
  error: "内容不能为空",
  timestamp: "2024-01-01T12:00:00.000Z"
}
```

## 完整工作流程

### 流程说明

1. **设置自动登录 iframe**
   - 使用自动登录 URL 设置 iframe：`https://atypica.musedam.cc/auth/impersonation-login?token=xxxxxx`
   - 用户会自动登录到指定账号

2. **监听页面变化**
   - 监听 `type: "href"` 消息，获取当前页面的 URL
   - 每次页面切换都会收到此消息

3. **触发新建研究**
   - 当收到 `href` 为首页的消息时，立即发送 `createStudyUserChat` 动作
   - iframe 内会自动创建研究并跳转到新的研究页面

4. **等待跳转完成**
   - 继续监听 `type: "href"` 消息
   - 当收到 `/study/xxx` 格式的 URL 时，说明已跳转到研究页面

5. **查询分析报告**
   - 在研究页面发送 `fetchAnalystReportsOfStudyUserChat` 消息
   - 收到 `action_result` 消息，包含报告列表数据

### 典型流程示例

```javascript
let currentUrl = "";
let studyCreated = false;

window.addEventListener("message", function (event) {
  if (event.data.source !== "atypica") return;

  // 监听页面变化
  if (event.data.type === "href") {
    currentUrl = event.data.href;
    console.log("页面变化:", currentUrl);

    // 如果是首页且还未创建研究，则创建研究
    if (currentUrl.includes("musedam.cc/") && !currentUrl.includes("/study/") && !studyCreated) {
      studyCreated = true;
      createStudy();
    }

    // 如果跳转到了研究页面，开始查询报告
    if (currentUrl.includes("/study/")) {
      console.log("已进入研究页面，开始查询报告");
      setTimeout(() => {
        fetchReports();
      }, 2000); // 等待页面完全加载
    }
  }

  // 处理动作结果
  if (event.data.type === "action_result") {
    if (event.data.action === "createStudyUserChat") {
      console.log("研究创建成功:", event.data.data);
    } else if (event.data.action === "fetchAnalystReportsOfStudyUserChat") {
      console.log("收到分析报告:", event.data.data);
      displayReports(event.data.data);
    }
  }
});

function createStudy() {
  iframe.contentWindow.postMessage(
    {
      target: "atypica",
      type: "action",
      action: "createStudyUserChat",
      args: {
        content: "请分析一下苹果公司的最新财报",
      },
      timestamp: new Date().toISOString(),
    },
    "*",
  );
}

function fetchReports() {
  iframe.contentWindow.postMessage(
    {
      target: "atypica",
      type: "action",
      action: "fetchAnalystReportsOfStudyUserChat",
      timestamp: new Date().toISOString(),
    },
    "*",
  );
}
```

## 完整示例

### HTML 页面

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Atypica 嵌入示例</title>
  </head>
  <body>
    <div id="controls">
      <button onclick="checkAuth()">检查认证</button>
      <button onclick="fetchReports()">获取报告</button>
      <button onclick="createStudy()">创建研究</button>
      <span id="auth-status">未知</span>
    </div>

    <div>
      <textarea
        id="study-input"
        placeholder="输入研究内容..."
        style="width: 100%; height: 80px;"
      ></textarea>
    </div>

    <iframe
      id="atypica-iframe"
      src="https://atypica.musedam.cc/auth/impersonation-login?token=your-impersonation-token"
      width="100%"
      height="600px"
    >
    </iframe>

    <div id="results"></div>
    <div id="create-results"></div>

    <script>
      const iframe = document.getElementById("atypica-iframe");
      const authStatus = document.getElementById("auth-status");
      const results = document.getElementById("results");

      let currentUrl = "";
      let studyCreated = false;

      // 监听消息
      window.addEventListener("message", function (event) {
        if (event.data.source !== "atypica") return;

        console.log("收到消息:", event.data);

        switch (event.data.type) {
          case "href":
            currentUrl = event.data.href;
            console.log("URL 变化:", currentUrl);

            // 如果是首页且还未创建研究，则自动创建研究
            if (
              currentUrl.includes("musedam.cc/") &&
              !currentUrl.includes("/study/") &&
              !studyCreated
            ) {
              studyCreated = true;
              setTimeout(createStudy, 1000); // 延时确保页面加载完成
            }

            // 如果跳转到了研究页面，自动查询报告
            if (currentUrl.includes("/study/")) {
              console.log("已进入研究页面，开始查询报告");
              setTimeout(fetchReports, 2000); // 等待页面完全加载
            }
            break;

          case "auth_status":
            const status = event.data.authenticated ? "已登录" : "未登录";
            const user = event.data.user ? ` (${event.data.user.email})` : "";
            authStatus.textContent = status + user;
            break;

          case "action_result":
            if (event.data.action === "fetchAnalystReportsOfStudyUserChat") {
              displayReports(event.data.data);
            } else if (event.data.action === "createStudyUserChat") {
              displayCreateResult(event.data.data);
              console.log("研究创建成功，等待页面跳转...");
            }
            break;

          case "action_error":
            if (event.data.action === "createStudyUserChat") {
              displayCreateError(event.data.error);
            }
            break;
        }
      });

      // 检查认证状态
      function checkAuth() {
        iframe.contentWindow.postMessage(
          {
            target: "atypica",
            type: "check_auth",
            timestamp: new Date().toISOString(),
          },
          "*",
        );
      }

      // 获取分析师报告
      function fetchReports() {
        iframe.contentWindow.postMessage(
          {
            target: "atypica",
            type: "action",
            action: "fetchAnalystReportsOfStudyUserChat",
            timestamp: new Date().toISOString(),
          },
          "*",
        );
      }

      // 创建研究对话
      function createStudy() {
        const content = document.getElementById("study-input").value.trim();
        if (!content) {
          alert("请输入研究内容");
          return;
        }

        iframe.contentWindow.postMessage(
          {
            target: "atypica",
            type: "action",
            action: "createStudyUserChat",
            args: {
              content: content,
            },
            timestamp: new Date().toISOString(),
          },
          "*",
        );
      }

      // 显示报告
      function displayReports(reports) {
        if (!reports || reports.length === 0) {
          results.innerHTML = "<p>未找到报告</p>";
          return;
        }

        let html = `<h3>找到 ${reports.length} 个报告:</h3>`;
        reports.forEach((report, index) => {
          html += `
                    <div style="border: 1px solid #ccc; padding: 10px; margin: 5px 0;">
                        <strong>报告 ${index + 1}:</strong> ${report.token}
                        <br>
                        <a href="/artifacts/report/${report.token}/raw" target="_blank">
                            查看报告
                        </a>
                    </div>
                `;
        });
        results.innerHTML = html;
      }

      // 显示创建研究结果
      function displayCreateResult(data) {
        const createResults = document.getElementById("create-results");
        if (!data || !data.token) {
          createResults.innerHTML = '<p style="color: red;">创建研究失败</p>';
          return;
        }

        createResults.innerHTML = `
          <div style="border: 1px solid #28a745; padding: 10px; margin: 5px 0; background: #d4edda;">
            <h3>研究创建成功！</h3>
            <p><strong>Token:</strong> ${data.token}</p>
            <p><a href="/study/${data.token}" target="_blank">打开研究页面</a></p>
          </div>
        `;
      }

      // 显示创建研究错误
      function displayCreateError(error) {
        const createResults = document.getElementById("create-results");
        createResults.innerHTML = `
          <div style="border: 1px solid #dc3545; padding: 10px; margin: 5px 0; background: #f8d7da;">
            <h3>创建研究失败</h3>
            <p style="color: #721c24;">错误: ${error}</p>
          </div>
        `;
      }

      // 页面加载后自动检查认证状态
      window.addEventListener("load", function () {
        setTimeout(checkAuth, 1000);
      });
    </script>
  </body>
</html>
```

## 安全考虑

1. **域名验证**: 建议验证消息来源域名
2. **消息过滤**: 忽略非 Atypica 消息
3. **HTTPS**: 生产环境必须使用 HTTPS

```javascript
window.addEventListener("message", function (event) {
  // 验证来源域名
  if (event.origin !== "https://your-trusted-domain.com") {
    return;
  }

  // 验证消息格式
  if (event.data.source !== "atypica") {
    return;
  }

  // 处理消息...
});
```

## 错误处理

```javascript
// 设置超时机制
function sendMessageWithTimeout(message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const messageId = Date.now().toString();
    message.messageId = messageId;

    const timer = setTimeout(() => {
      reject(new Error("消息超时"));
    }, timeout);

    const handler = (event) => {
      if (event.data.messageId === messageId) {
        clearTimeout(timer);
        window.removeEventListener("message", handler);
        resolve(event.data);
      }
    };

    window.addEventListener("message", handler);
    iframe.contentWindow.postMessage(message, "*");
  });
}
```

## 调试技巧

1. **启用控制台日志**:

```javascript
window.addEventListener("message", function (event) {
  console.log("postMessage 调试:", {
    origin: event.origin,
    data: event.data,
    timestamp: new Date().toISOString(),
  });
});
```

2. **使用浏览器开发者工具**:
   - Network 标签页查看 iframe 加载状态
   - Console 标签页查看消息日志
   - Application 标签页检查存储状态

## 常见问题

### Q: iframe 加载失败怎么办？

A: 检查 URL 是否正确，确保目标页面支持iframe嵌入（没有设置 X-Frame-Options）。

### Q: 消息没有收到响应？

A: 确保 iframe 完全加载后再发送消息，可以使用延时或监听 load 事件。

### Q: 跨域问题怎么解决？

A: 确保使用 postMessage API，不要尝试直接访问 iframe 内容。

## 支持的功能

### 1. 获取分析师报告

- **动作名称**: `fetchAnalystReportsOfStudyUserChat`
- **适用路径**: `/study/[token]`
- **返回数据**: 分析师报告列表

### 2. 创建研究对话

- **动作名称**: `createStudyUserChat`
- **参数**: `content` (字符串) - 研究内容
- **适用路径**: 任何页面
- **返回数据**: 新创建的对话信息，包含 token 和 id

## 支持的路由

目前支持嵌入的路由：

- `/auth/impersonation-login?token=[token]` - 自动登录页面
- `/study/[token]` - 研究页面
- `/` - 主页 (支持创建新研究)

## 自动登录说明

使用自动登录功能可以让用户无需手动登录即可使用嵌入的应用：

1. **获取登录令牌**: 从系统管理员处获取 impersonation token
2. **设置 iframe URL**: 使用 `https://atypica.musedam.cc/auth/impersonation-login?token=xxxxx`
3. **自动跳转**: 用户将自动登录并跳转到首页

## 联系我们

如有技术问题，请联系开发团队。
