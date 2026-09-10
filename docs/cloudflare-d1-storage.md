# Cloudflare D1 存档

当前项目支持两种存档模式，通过 URL 参数选择：

- 无 `storage` 参数：纯浏览器本地存档，默认模式，完全离线可玩。
- `?storage=local`：显式指定纯浏览器本地存档。
- `?storage=d1`：Cloudflare Pages Function + D1 云端存档；浏览器仍保留本地缓存作为断网/请求失败时的兜底。

示例：

```text
https://你的域名.example/
https://你的域名.example/?storage=local
https://你的域名.example/?storage=d1
```

也可以使用 `?storage=cloud` 或 `?storage=remote` 作为 D1 模式别名。

## 1. D1 存的是什么

D1 不再只有一个模糊的 JSON 字段，而是保存完整存档快照 + 可查询的玩家数据投影。

`player_saves` 至少记录：

```text
player_id
revision
save_version
client_updated_at
last_played

# 战斗统计
high_wave
max_kills
total_kills
total_runs
max_survival_time

# 货币 / 能量
scrap
gems
energy
max_energy
last_energy_refresh

# 指挥官
commander_level
commander_exp

# 关卡
highest_stage_cleared
unlocked_stage
equipped_stage
current_mode
total_stages_cleared

# 当前配置
selected_pet
equipped_weapon

# 完整系统数据
unlocked_synergies
cleared_elite_stages
rune_levels
fortification
pet_data
weapon_data
skill_data
inventory

data                 # 完整 JSON 存档快照，用于向后兼容和恢复
created_at
updated_at
```

其中 `inventory / weapon_data / pet_data / skill_data / rune_levels / fortification` 等仍保留完整 JSON，因此新增物资和系统字段时不需要立刻修改数据库结构；同时废料、钻石、能量、关卡、波次、指挥官等级等常用字段可以直接 SQL 查询。

## 2. 创建 D1

在 Cloudflare 控制台创建一个 D1 数据库，例如：

```text
kaipao-save
```

## 3. 初始化表

按顺序执行：

```text
1. db/migrations/0001_player_saves.sql
2. db/migrations/0002_player_save_profile.sql
```

不要重复执行已经完成的 migration。

使用 Wrangler 或 Cloudflare D1 控制台均可执行 SQL。

## 4. 配置 Pages D1 Binding

在 Cloudflare Pages 项目中进入 Settings / Functions / Bindings，添加 D1 binding：

```text
Binding name: KAIPAO_DB
Database: 选择刚创建的 D1
```

代码中的 `functions/api/save.js` 会读取：

```js
env.KAIPAO_DB
```

没有配置 binding 时，`?storage=d1` 不会让游戏崩溃，会自动继续使用浏览器本地缓存，并在控制台输出 D1 不可用提示。

## 5. 玩家标识

第一阶段使用匿名 `playerId/deviceId`：

```text
自动生成：crypto.randomUUID()
```

并保存到浏览器：

```text
starcore_vanguard_device_id_v1
```

API 同时接受：

```text
X-Player-Id
X-Device-Id
?playerId=...
?deviceId=...
```

例如：

```http
GET /api/save?playerId=demo-player-001
X-Player-Id: demo-player-001
```

当前匿名 ID 不是登录账号，用户可以伪造 ID；因此当前版本适合云存档，不适合作为可信的充值、交易、竞技排行数据源。

## 6. API

### 读取玩家完整存档

```http
GET /api/save?deviceId=<deviceId>
X-Device-Id: <deviceId>
```

返回包含：

```text
revision
clientUpdatedAt
data
profile.progression
profile.wallet
profile.loadout
profile.inventory
profile.runeLevels
profile.fortification
profile.petData
profile.weaponData
profile.skillData
profile.unlockedSynergies
profile.clearedEliteStages
```

### 保存玩家完整存档

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

API 会在一次写入中同步完整 JSON 存档和结构化字段，避免只保存部分玩家数据。

## 7. 同步与冲突

D1 模式流程：

```text
启动
 ↓
读取浏览器本地存档
 ↓
请求 D1
 ↓
比较 clientUpdatedAt
 ↓
较新的版本作为当前版本
 ↓
游戏运行期间继续本地缓存
 ↓
后台批量同步 D1
```

数据库使用 `revision` 做乐观并发控制。

如果两个客户端同时修改同一个玩家存档：

```text
revision 不一致
 ↓
HTTP 409
 ↓
客户端保留冲突前的本地快照
 ↓
采用服务器版本
```

这样不会静默覆盖服务器，也不会无提示地丢掉本地数据。

## 8. 两种运行方式

### 单机

```text
https://你的域名.example/
```

或：

```text
https://你的域名.example/?storage=local
```

不会访问 `/api/save`，数据只留在浏览器。

### D1 云端

```text
https://你的域名.example/?storage=d1
```

流程：

```text
浏览器
  ↓
CloudStorageBridge
  ↓
/api/save
  ↓
Cloudflare Pages Function
  ↓
KAIPAO_DB
  ↓
Cloudflare D1
```

## 9. 后续账号体系

当前 `player_id` 是匿名标识。以后增加登录时，可以把：

```text
anonymous deviceId
        ↓
登录账号 userId
```

再增加 `users` / `player_accounts` 表，把多个设备绑定到一个账号，而不需要改变现有游戏存档结构。
