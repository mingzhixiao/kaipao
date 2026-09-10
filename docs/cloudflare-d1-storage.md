# Cloudflare D1 存档

当前项目支持两种存档模式，通过 URL 参数选择：

- `?storage=local`：纯浏览器本地存档，默认模式，完全离线可玩。
- `?storage=d1`：Cloudflare Pages Function + D1 云端存档；浏览器仍保留本地缓存作为断网/请求失败时的兜底。

例如：

```text
https://你的域名.example/?storage=local
https://你的域名.example/?storage=d1
```

## 1. 创建 D1

在 Cloudflare 控制台创建一个 D1 数据库，例如 `kaipao-save`。

## 2. 初始化表

执行 `db/migrations/0001_player_saves.sql`。

使用 Wrangler 时可根据你的数据库名称执行对应的 D1 migration / SQL 命令；也可以直接在 Cloudflare D1 控制台执行 SQL。

## 3. 配置 Pages D1 Binding

在 Cloudflare Pages 项目中进入 Functions / Settings 的 D1 bindings，将：

```text
Binding name: KAIPAO_DB
Database: 选择刚创建的 D1
```

代码中的 `functions/api/save.js` 会读取 `env.KAIPAO_DB`。

没有配置 binding 时，`?storage=d1` 不会破坏游戏，会自动继续使用浏览器本地缓存，并在控制台输出 D1 不可用提示。

## 4. API

### 读取

```http
GET /api/save?deviceId=<deviceId>
X-Device-Id: <deviceId>
```

### 保存

```http
PUT /api/save
Content-Type: application/json
X-Device-Id: <deviceId>
```

请求体：

```json
{
  "deviceId": "...",
  "baseRevision": 3,
  "clientUpdatedAt": 1760000000000,
  "data": {}
}
```

`revision` 使用乐观并发控制。发生版本冲突时 API 返回 HTTP `409` 和服务器存档，前端会先备份本地冲突存档，再采用服务器版本，避免无提示地覆盖本地数据。

## 5. 存档模式代码入口

游戏代码通过：

```text
src/systems/CloudStorageBridge.js
```

接入存储，不需要让 Game、UI、技能、宠物等业务代码知道存储介质。

当前 `SaveManager` 仍然作为游戏存档领域层，数据结构保持兼容；D1 只保存完整 JSON 存档。

## 6. 当前安全边界

现在使用自动生成的 `deviceId` 作为匿名玩家标识，适合第一阶段的云存档和跨会话恢复，但它**不是身份认证**。用户可以伪造 deviceId，也可以修改客户端存档，因此不能把当前版本直接作为可信的充值、交易或排行榜数据源。

后续接入账号体系时，可以在不修改游戏存档结构的前提下，将 `deviceId` 替换/绑定到真实 `userId`，并在 Pages Function 中验证登录态。
