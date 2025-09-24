*   文档首页
/豆包语音/开发参考/语音播客大模型/播客API-websocket-v3协议

播客API-websocket-v3协议

1 接口功能

火山控制台开启试用：https://console.volcengine.com/speech/service/10028

对送入的播客主题文本或链接进行分析，流式生成双人播客音频。  
支持断点重试。

2 接口说明

## 2.1 请求Request

### 请求路径

`wss://openspeech.bytedance.com/api/v3/sami/podcasttts`  

### 建连&鉴权

#### Request Headers

| Key | 说明  | 是否必须 | Value示例 |
| --- | --- | --- | --- |
| X-Api-App-Id | 使用火山引擎控制台获取的APP ID，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F) | 是   | your-app-id |
| X-Api-Access-Key | 使用火山引擎控制台获取的Access Token，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F) | 是   | your-access-key |
| X-Api-Resource-Id | 表示调用服务的资源信息 ID<br><br>*   播客语音合成：volc.service\_type.10050 | 是   | *   播客语音合成：volc.service\_type.10050 |
| X-Api-App-Key | 固定值 | 是   | aGjiRDfUWi |
| X-Api-Request-Id | 标识客户端请求ID，uuid随机字符串 | 否   | 67ee89ba-7050-4c04-a3d7-ac61a63499b3 |

#### Response Headers

| Key | 说明  | Value示例 |
| --- | --- | --- |
| X-Tt-Logid | 服务端返回的 logid，建议用户获取和打印方便定位问题 | 2025041513355271DF5CF1A0AE0508E78C |

### WebSocket 二进制协议

WebSocket 使用二进制协议传输数据。  
协议的组成由至少 4 个字节的可变 header、payload size 和 payload 三部分组成，其中

*   header 描述消息类型、序列化方式以及压缩格式等信息；
*   payload size 是 payload 的长度；
*   payload 是具体负载内容，依据消息类型不同 payload 内容不同；

需注意：协议中整数类型的字段都使用**大端**表示。  

##### 二进制帧

| Byte | Left 4-bit | Right 4-bit | 说明  |
| --- | --- | --- | --- |
| 0 - Left half | Protocol version |     | 目前只有v1，始终填0b0001 |
| 0 - Right half |     | Header size (4x) | 目前只有4字节，始终填0b0001 |
| 1 - Left half | Message type |     | 固定为0b001 |
| 1 - Right half |     | Message type specific flags | 在sendText时，为0  <br>在finishConnection时，为0b100 |
| 2 - Left half | Serialization method |     | 0b0000：Raw（无特殊序列化方式，主要针对二进制音频数据）0b0001：JSON（主要针对文本类型消息） |
| 2 - Right half |     | Compression method | 0b0000：无压缩0b0001：gzip |
| 3   | Reserved |     | 留空（0b0000 0000） |
| \[4 ~ 7\] | \[Optional field,like event number,...\] |     | 取决于Message type specific flags，可能有、也可能没有 |
| ... | Payload |     | 可能是音频数据、文本数据、音频文本混合数据 |

###### payload请求参数

| **字段** | **描述** | **是否必须** | **类型** | **默认值** |
| --- | --- | --- | --- | --- |
| action | 生成类型：<br><br>*   0：根据提供的 input\_text 或者 input\_info.input\_url 总结生成播客<br>*   3：根据提供的 nlp\_texts 对话文本直接生成播客<br>*   4：根据提供的 prompt\_text 文本扩展生成播客 | 是   | number | 0   |
| input\_text | 待播客合成输入文本，模型截断 2.5w<br><br>> action = 0 时候和 input\_info.input\_url 二选一，都不为空优先生效 input\_text | 否   | string | ——  |
| prompt\_text | prompt文本，不具备指令能力<br><br>> action = 4 时必填  <br>> 一般比较简单，比如 “火山引擎” ，“怎么平衡工作和生活？” | 否   | string | ——  |
| nlp\_texts | 代合成的播客轮次文本列表<br><br>> action = 3 时必填 | 否   | \[\]object | ——  |
| nlp\_texts.text | 每个轮次播客文本<br><br>> 单轮不超过 300 字符  <br>> 总文本长度不超过 10000 字符 | 否   | string | ——  |
| nlp\_texts.speaker | 每个轮次播客发音人<br><br>> 详细参见：可选发音人列表 | 否   | string | ——  |
| input\_info | 输入辅助信息 | 否   | object | ——  |
| input\_info.input\_url | 网页链接或者可下载的文件(pdf,doc,txt)链接,会自动转换成长文播客文本 | 否   | string | ——  |
| input\_info.only\_nlp\_text | 只输出播客轮次文本列表，没有音频 | 否   | bool | ——  |
| input\_info.return\_audio\_url | 返回可下载的完整播客音频链接，有效期 1h<br><br>> 新增一个事件 363 （PodcastEnd），里面会有 meta\_info.audio\_url 字段 |     |     |     |
| input\_id | 播客文本关联的唯一 id | 否   | string | ——  |
| use\_head\_music | 是否使用开头音效 | 否   | bool | true |
| use\_tail\_music | 是否使用结尾音效 | 否   | bool | false |
| aigc\_watermark | 是否在合成结尾增加音频节奏标识 | 否   | bool | false |
| audio\_config | 音频参数，便于服务节省音频解码耗时 | 否   | object | ——  |
| audio\_config.format | 音频编码格式，mp3/ogg\_opus/pcm/aac | 否   | string | pcm |
| audio\_config.sample\_rate | 音频采样率，可选值 \[16000, 24000, 48000\] | 否   | number | 24000 |
| audio\_config.speech\_rate | 语速，取值范围\[-50,100\]，100代表2.0倍速，-50代表0.5倍数 | 否   | number | 0   |
| speaker\_info | 指定发音人信息 | 否   | object | ——  |
| speaker\_info.random\_order | 2发音人是否随机顺序开始，默认是 | 否   | bool | true |
| speaker\_info.speakers | 播客发音人, 只能选择 2 发音人<br><br>> 详细参见：可选发音人列表 | 否   | \[\]string |     |
| retry\_info | 重试信息 | 否   | object | ——  |
| retry\_info.retry\_task\_id | 前一个没获取完整的播客记录的 task\_id(第一次StartSession使用的 session\_id就是任务的 task\_id) | 否   | string | ——  |
| retry\_info.last\_finished\_round\_id | 前一个获取完整的播客记录的轮次 id | 否   | number | ——  |

**可选发音人列表**

> 发音人的选择最好用同个系列的配对使用会有更好的效果  
> 默认：dayi/mizai 系列

| **系列** | **发音人名称** |
| --- | --- |
| 黑猫侦探社咪仔 | zh\_female\_mizaitongxue\_v2\_saturn\_bigtts |
| zh\_male\_dayixiansheng\_v2\_saturn\_bigtts |
| 刘飞和潇磊 | zh\_male\_liufei\_v2\_saturn\_bigtts |
| zh\_male\_xiaolei\_v2\_saturn\_bigtts |

**参数使用示例**  
action = 0 长文本模式示例

```JSON
{
    "input_id": "test_podcast",
    "input_text": "分析下当前的大模型发展",
    "action": 0,
    "use_head_music": false,
    "audio_config": {
        "format": "mp3",
        "sample_rate": 24000,
        "speech_rate": 0,
    },
    "speaker_info": {
        "random_order": true,
        "speakers": [
            "zh_male_dayixiansheng_v2_saturn_bigtts",
            "zh_female_mizaitongxue_v2_saturn_bigtts"
        ]
    }
}
```

action = 0 url 解析模式示例

```JSON
{
    "input_id": "test_podcast",
    "action": 0,
    "use_head_music": false,
    "audio_config": {
        "format": "mp3",
        "sample_rate": 24000,
        "speech_rate": 0,
    },
    "input_info": {
        "input_url": "https://mp.weixin.qq.com/s/CiN0XRWQc3hIV9lLLS0rGA"
    }
}
```

action = 3 根据提供的对话文本调用示例

```JSON
{
    "input_id": "test_podcast",
    "action": 3,
    "use_head_music": false,
    "audio_config": {
        "format": "mp3",
        "sample_rate": 24000,
        "speech_rate": 0,
    },
    "nlp_texts": [
        {
            "speaker": "zh_male_dayixiansheng_v2_saturn_bigtts",
            "text": "今天呢我们要聊的呢是火山引擎在这个 FORCE 原动力大会上面的一些比较重磅的发布。"
        },
        {
            "speaker": "zh_female_mizaitongxue_v2_saturn_bigtts",
            "text": "来看看都有哪些亮点哈。"
        }
    ]
}
```

action = 4 根据提供prompt文本调用示例

```JSON
{
    "input_id": "test_podcast",
    "action": 4,
    "prompt_text": "火山引擎",
    "use_head_music": false,
    "audio_config": {
        "format": "mp3",
        "sample_rate": 24000,
        "speech_rate": 0,
    }
}
```

## 2.2 响应Response

### 建连响应

主要关注建连阶段 HTTP Response 的状态码和 Body

*   建连成功：状态码为 200
*   建连失败：状态码不为 200，Body 中提供错误原因说明

### WebSocket 传输响应

#### 二进制帧 - 正常响应帧

| Byte | Left 4-bit | Right 4-bit | 说明  |
| --- | --- | --- | --- |
| 0 - Left half | Protocol version |     | 目前只有v1，始终填0b0001 |
| 0 - Right half |     | Header size (4x) | 目前只有4字节，始终填0b0001 |
| 1 - Left half | Message type |     | 音频帧返回：0b1011  <br>其他帧返回：0b1001 |
| 1 - Right half |     | Message type specific flags | 固定为0b0100 |
| 2 - Left half | Serialization method |     | 0b0000：Raw（无特殊序列化方式，主要针对二进制音频数据）0b0001：JSON（主要针对文本类型消息） |
| 2 - Right half |     | Compression method | 0b0000：无压缩0b0001：gzip |
| 3   | Reserved |     | 留空（0b0000 0000） |
| \[4 ~ 7\] | \[Optional field,like event number,...\] |     | 取决于Message type specific flags，可能有、也可能没有 |
| ... | Payload |     | 可能是音频数据、文本数据、音频文本混合数据 |

##### payload响应参数

| 字段  | 描述  | 类型  |
| --- | --- | --- |
| data | 返回的二进制数据包 | byte |
| event | 返回的事件类型 | number |

#### 二进制帧 - 错误响应帧

| Byte | Left 4-bit | Right 4-bit | 说明  |
| --- | --- | --- | --- |
| 0 - Left half | Protocol version |     | 目前只有v1，始终填0b0001 |
| 0 - Right half |     | Header size (4x) | 目前只有4字节，始终填0b0001 |
| 1   | Message type | Message type specific flags | 0b11110000 |
| 2 - Left half | Serialization method |     | 0b0000：Raw（无特殊序列化方式，主要针对二进制音频数据）0b0001：JSON（主要针对文本类型消息） |
| 2 - Right half |     | Compression method | 0b0000：无压缩0b0001：gzip |
| 3   | Reserved |     | 留空（0b0000 0000） |
| \[4 ~ 7\] | Error code |     | 错误码 |
| ... | Payload |     | 错误消息对象 |

## 2.3 event定义

在生成 podcast 阶段，不需要客户端发送上行的event帧。event类型如下：

| Event code | 含义  | 事件类型 | 应用阶段：上行/下行 |
| --- | --- | --- | --- |
| 150 | SessionStarted，会话任务开始 | Session 类 | 下行  |
| 360 | PodcastRoundStart，播客返回新轮次内容开始，带着轮次 idx 和 speaker | 数据类 | 下行  |
| 361 | PodcastRoundResponse，播客返回轮次的音频内容 | 数据类 | 下行  |
| 362 | PodcastRoundEnd，播客返回内容当前轮次结束 | 数据类 | 下行  |
| 363 | PodcastEnd，返回一些播客总结性的信息，表示播客结束（为了兼容之前的使用，这个事件不一定会返回）  <br>示例：{'meta\_info': {'audio\_url': 'https://speech-tts-podcast.tos-cn-beijing.volces.com/speech-tts-podcast/tts\_audio/aGjiRDfUWi/b598a76a-ebb2-4117-9270-9b3b740e1adb/podcast\_demo.mp3?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTY2M5ZDg4NzA2MDUxNDI0ZThkMTU5YTNkNjk4ZDg5OTM%2F20250825%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20250825T070712Z&X-Tos-Expires=3600&X-Tos-Signature=55a5e2d0bd40f91fc846068f9d35737b96e9891134aabb783b973f91b5f993c9&X-Tos-SignedHeaders=host', 'topics': None}} | 数据类 | 下行  |
| 152 | SessionFinished，会话已结束（上行&下行）  <br>标识语音一个完整的语音合成完成 | Session 类 | 下行  |
| 154 | UsageResponse, 播客返回的用量事件。  <br>示例:{"usage":{"input\_text\_tokens":980,"output\_audio\_tokens":0}} 其中input\_text\_tokens表示"API调用token-输入-文本", output\_audio\_tokens表示"API调用token-输出-音频" 。 | 数据类 | 下行  |

在关闭连接阶段，需要客户端传递上行event帧去关闭连接。event类型如下：

| Event code | 含义  | 事件类型 | 应用阶段：上行/下行 |
| --- | --- | --- | --- |
| 2   | FinishConnection，结束连接 | Connect 类 | 上行  |
| 52  | ConnectionFinished 结束连接成功 | Connect 类 | 下行  |

**示意图（重要！！！！）**：

![Image](https://p9-arcosite.byteimg.com/tos-cn-i-goo7wpa0wc/9b8ade61c5c94728b1b789769272eb1c~tplv-goo7wpa0wc-image.image)  

## 2.4 不同类型帧举例说明

### StartSession

#### 请求 request

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | StartSession |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(payload) |     |
| 28 ~ ... | {}  |     | `payload` 见下面的例子 |     |

`payload`

```JSON
{
    "input_id": "test_podcast",
    "input_text": "分析下当前的大模型发展",
    "scene": "deep_research",
    "action": 0,
    "use_head_music": false,
    "audio_params": {
        "format": "pcm",
        "sample_rate": 24000,
        "speech_rate": 0,
    }
}
```

断点续传的时候需要加上 retry 信息  
`payload`

```JSON
{
    "input_id": "test_podcast",
    "input_text": "分析下当前的大模型发展",
    "scene": "deep_research",
    "action": 0,
    "use_head_music": false,
    "audio_params": {
        "format": "pcm",
        "sample_rate": 24000,
        "speech_rate": 0,
    },
    "retry_info": {
        "retry_task_id": "xxxxxxxxx",
        "last_finished_round_id": 5
    }
}
```

#### 响应Response

##### SessionStarted

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1011 | 0100 | Audio-only response | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | SessionStarted |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(audio\_binary) |     |
| 28 ~ ... | {  <br>} |     | payload\_json  <br>扩展保留，暂留空JSON |     |

**UsageResponse**

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1011 | 0100 | Audio-only response | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | UsageResponse |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(audio\_binary) |     |
| 28 ~ ... | 文本 token 消耗推送：  <br>{"usage":{"input\_text\_tokens":980,"output\_audio\_tokens":0}}  <br>音频 token 消耗推送：  <br>{"usage":{"input\_text\_tokens": 0,"output\_audio\_tokens":501}} |     | payload\_json  <br>用量信息 |     |

下面三个事件循环 ♻️,如果没有收到PodcastTTSRoundEnd（需要和PodcastSpeaker成对出现）就断掉了链接说明需要断点续传重新发起请求  

##### PodcastRoundStart

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1011 | 0100 | Audio-only response | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | PodcastRoundStart |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(audio\_binary) |     |
| 28 ~ ... | {  <br>"text\_type": "", // 文本类型  <br>"speaker": "", // 本次说话speaker  <br>"round\_id": -1, // 对话轮次，-1 是开头音乐  <br>"text": "" // 对话文本  <br>} |     | response\_meta\_json<br><br>round\_id == -1，代表开头音频  <br>round\_id ==9999，代表结尾音频 |     |

##### PodcastRoundResponse

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | PodcastTTSResponse |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(payload) |     |
| 28 ~ ... | ... 音频内容 |     | payload |     |

##### PodcastRoundEnd

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | PodcastRoundEnd |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(response\_meta\_json) |     |
| 28 ~ ... | {  <br>"is\_error": true,  <br>"error\_msg": "something error"  <br>}  <br>or  <br>{  <br>"audio\_duration":8.419333 // 单位秒  <br>} |     | response\_meta\_json |     |

##### PodcastEnd

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | PodcastEnd |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(response\_meta\_json) |     |
| 28 ~ ... | {'meta\_info': {'audio\_url': 'https://speech-tts-podcast.tos-cn-beijing.volces.com/speech-tts-podcast/tts\_audio/aGjiRDfUWi/a0979493-196a-42ad-aff1-1dfe63c7e219/podcast\_demo.mp3?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTY2M5ZDg4NzA2MDUxNDI0ZThkMTU5YTNkNjk4ZDg5OTM%2F20250825%2Fcn-beijing%2Ftos%2Frequest&X-Tos-Date=20250825T084035Z&X-Tos-Expires=3600&X-Tos-Signature=2a549ee5f5ed8a32ce34d475ccf56f50a02e78b3431eb760fb9edc3d0d15296b&X-Tos-SignedHeaders=host', 'topics': None}} |     | response\_meta\_json  <br>没有需要返回的 meta 信息这个事件不会推送 |     |

### FinishSession

#### 请求request

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | FinishSession |     | event type |     |
| 8 ~ 11 | uint32(12) |     | len(<session\_id>) |     |
| 12 ~ 23 | nxckjoejnkegf |     | session\_id |     |
| 24 ~ 27 | uint32( ...) |     | len(payload) |     |
| 28 ~ ... | {}  |     | tts\_session\_meta |     |

#### 响应response

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | SessionFinished |     | event type |     |
| 8 ~ 11 | uint32(7) |     | len(<connection\_id>) |     |
| 12 ~ 15 | uint32(58) |     | len(<response\_meta\_json>) |     |
| 28 ~ ... | {  <br>"status\_code": 20000000,  <br>"message": "ok"  <br>} |     | response\_meta\_json<br><br>*   仅含status\_code和message字段 |     |

### FinishConnection

#### 请求request

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | FinishConnection |     | event type |     |
| 8 ~ 11 | uint32(2) |     | len(<response\_meta\_json>) |     |
| 12 ~ 13 | {}  |     | tts\_session\_meta |     |

#### 响应response

| Byte | Left 4-bit | Right 4-bit | 说明  |     |
| --- | --- | --- | --- | --- |
| 0   | 0001 | 0001 | v1  | 4-byte header |
| 1   | 1001 | 0100 | Full-client request | with event number |
| 2   | 0001 | 0000 | JSON | no compression |
| 3   | 0000 | 0000 |     |     |
| 4 ~ 7 | ConnectionFinished |     | event type |     |
| 8 ~ 11 | uint32(7) |     | len(<connection\_id>) |     |
| 12 ~ 15 | uint32(58) |     | len(<response\_meta\_json>) |     |
| 28 ~ ... | {  <br>"status\_code": 20000000,  <br>"message": "ok"  <br>} |     | response\_meta\_json<br><br>*   仅含status\_code和message字段 |     |

3 错误码

| Code | Message | 说明  |
| --- | --- | --- |
| 20000000 | ok  | 音频合成结束的成功状态码 |
| 45000000 | quota exceeded for types: concurrency | 并发限流，一般是请求并发数超过限制 |
| 55000000 | 服务端一些error | 服务端通用错误 |
| 50700000 | action = 0 的报错：  <br>NLP RespError(50000001/Structure2writtenFailed:content filter)<br><br>action = 4 的报错：  <br>NLP RespError(50000001/server error: GetOutlineFailed:Failed to generate the podcast. The cause of the error is: content filter)  <br>或者  <br>NLP RespError(50000001/server error: GetOutlineFailed:Failed to generate the podcast. The cause of the error is: get outline base model return empty) | 触发安全审核过滤 |

4 调用示例

Python调用示例

Java调用示例

Go调用示例

C#调用示例

TypeScript调用示例

### 前提条件

*   调用之前，您需要获取以下信息：
    *   `<appid>`：使用控制台获取的APP ID，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。
    *   `<access_token>`：使用控制台获取的Access Token，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。

### Python环境

*   Python：3.9版本及以上。
*   Pip：25.1.1版本及以上。您可以使用下面命令安装。

```Bash
python3 -m pip install --upgrade pip
```

### 下载代码示例

volcengine.speech.volc\_speech\_python\_sdk\_1.0.0.25.tar.gz

未知大小

![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAYAAADzoH0MAAAABGdBTUEAALGPC/xhBQAAAHxJREFUOBHtUlsOgCAMAy8uPk7tj7YETFwGOBPDhzYZbKMrC8y7MnZx5EUcw0FLWnL9BSzdvsNVXzZd9ZVf6D8HfwfO8Q1G2KZYGshz0zisjVixcnQtxpoLFkR3BchVMSPbEiGnippIszgrT3BkJ8yZEMDOIvQfIaCKVsQBup49zbP0w5sAAAAASUVORK5CYII=)

解压缩代码包，安装依赖

```Bash
mkdir -p volcengine_podcasts_demo
tar xvzf volcengine_podcasts_demo.tar.gz -C ./volcengine_podcasts_demo
cd volcengine_podcasts_demo
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install --upgrade pip
pip3 install -e .
```

### 发起调用

> `<appid>`替换为您的APP ID。  
> `<access_token>`替换为您的Access Token。  
> `<`text`>` 为播客文本。

```Bash
python3 examples/volcengine/podcasts.py --appid <appid> --access_token <access_token> --text "介绍下火山引擎" 
```

### 前提条件

*   调用之前，您需要获取以下信息：
    *   `<appid>`：使用控制台获取的APP ID，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。
    *   `<access_token>`：使用控制台获取的Access Token，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。

### Java环境

*   Java：21版本及以上。
*   Maven：3.9.10版本及以上。

### 下载代码示例

volcengine.speech.volc\_speech\_java\_sdk\_1.0.0.19.tar.gz

未知大小

![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAYAAADzoH0MAAAABGdBTUEAALGPC/xhBQAAAHxJREFUOBHtUlsOgCAMAy8uPk7tj7YETFwGOBPDhzYZbKMrC8y7MnZx5EUcw0FLWnL9BSzdvsNVXzZd9ZVf6D8HfwfO8Q1G2KZYGshz0zisjVixcnQtxpoLFkR3BchVMSPbEiGnippIszgrT3BkJ8yZEMDOIvQfIaCKVsQBup49zbP0w5sAAAAASUVORK5CYII=)

解压缩代码包，安装依赖

```Bash
mkdir -p volcengine_podcasts_demo
tar xvzf volcengine_podcasts_demo.tar.gz -C ./volcengine_podcasts_demo
cd volcengine_podcasts_demo
```

### 发起调用

> `<appid>`替换为您的APP ID。  
> `<access_token>`替换为您的Access Token。  
> `<`text`>` 为播客文本。

```Bash
mvn compile exec:java -Dexec.mainClass=com.speech.volcengine.Podcasts -DappId=<appid> -DaccessToken=<access_token> -Dtext="介绍下火山引擎"
```

### 前提条件

*   调用之前，您需要获取以下信息：
    *   `<appid>`：使用控制台获取的APP ID，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。
    *   `<access_token>`：使用控制台获取的Access Token，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。

### Go环境

*   Go：1.21.0版本及以上。

### 下载代码示例

volcengine.speech.volc\_speech\_go\_sdk\_1.0.0.23.tar.gz

未知大小

![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAYAAADzoH0MAAAABGdBTUEAALGPC/xhBQAAAHxJREFUOBHtUlsOgCAMAy8uPk7tj7YETFwGOBPDhzYZbKMrC8y7MnZx5EUcw0FLWnL9BSzdvsNVXzZd9ZVf6D8HfwfO8Q1G2KZYGshz0zisjVixcnQtxpoLFkR3BchVMSPbEiGnippIszgrT3BkJ8yZEMDOIvQfIaCKVsQBup49zbP0w5sAAAAASUVORK5CYII=)

解压缩代码包，安装依赖

```Bash
mkdir -p volcengine_podcasts_demo
tar xvzf volcengine_podcasts_demo.tar.gz -C ./volcengine_podcasts_demo
cd volcengine_podcasts_demo
```

### 发起调用

> `<appid>`替换为您的APP ID。  
> `<access_token>`替换为您的Access Token。  
> `<`text`>` 为播客文本。

```Bash
go run volcengine/podcasts/main.go --appid <appid> --access_token <access_token>  --text "介绍下火山引擎"
```

### 前提条件

*   调用之前，您需要获取以下信息：
    *   `<appid>`：使用控制台获取的APP ID，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。
    *   `<access_token>`：使用控制台获取的Access Token，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。

### C#环境

*   .Net 9.0版本。

### 下载代码示例

解压缩代码包，安装依赖

```Bash
mkdir -p volcengine_podcasts_demo
tar xvzf volcengine_podcasts_demo.tar.gz -C ./volcengine_podcasts_demo
cd volcengine_podcasts_demo
```

### 发起调用

> `<appid>`替换为您的APP ID。  
> `<access_token>`替换为您的Access Token。  
> `<`text`>` 为播客文本。

```Bash
dotnet run --project Volcengine/Podcasts/Volcengine.Speech.Podcasts.csproj -- --appid <appid> --access_token <access_token> --text "介绍下火山引擎"
```

### 前提条件

*   调用之前，您需要获取以下信息：
    *   `<appid>`：使用控制台获取的APP ID，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。
    *   `<access_token>`：使用控制台获取的Access Token，可参考 [控制台使用FAQ-Q1](https://www.volcengine.com/docs/6561/196768#q1%EF%BC%9A%E5%93%AA%E9%87%8C%E5%8F%AF%E4%BB%A5%E8%8E%B7%E5%8F%96%E5%88%B0%E4%BB%A5%E4%B8%8B%E5%8F%82%E6%95%B0appid%EF%BC%8Ccluster%EF%BC%8Ctoken%EF%BC%8Cauthorization-type%EF%BC%8Csecret-key-%EF%BC%9F)。

### node环境

*   node：v24.0版本及以上。

### 下载代码示例

![](data:image/png;base64,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)

volcengine.speech.volc\_speech\_js\_sdk\_1.0.0.19.tar.gz

未知大小

![](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAYCAYAAADzoH0MAAAABGdBTUEAALGPC/xhBQAAAHxJREFUOBHtUlsOgCAMAy8uPk7tj7YETFwGOBPDhzYZbKMrC8y7MnZx5EUcw0FLWnL9BSzdvsNVXzZd9ZVf6D8HfwfO8Q1G2KZYGshz0zisjVixcnQtxpoLFkR3BchVMSPbEiGnippIszgrT3BkJ8yZEMDOIvQfIaCKVsQBup49zbP0w5sAAAAASUVORK5CYII=)

### 解压缩代码包，安装依赖

```Bash
mkdir -p volcengine_podcasts_demo
tar xvzf volcengine_podcasts_demo.tar.gz -C ./volcengine_podcasts_demo
cd volcengine_podcasts_demo
npm install
npm install -g typescript
npm install -g ts-node
```

### 发起调用

> `<appid>`替换为您的APP ID。  
> `<access_token>`替换为您的Access Token。  
> `<`text`>` 为播客文本。

```Bash
npx ts-node src/volcengine/podcasts.ts --appid <appid> --access_token <access_token> --text "介绍下火山引擎"
```
