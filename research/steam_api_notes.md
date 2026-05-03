# Steam Web API — 接入说明

**整理日期**: 2026-04-29  
**官方文档**: https://partner.steamgames.com/doc/webapi_overview

---

## 核心接口

### 获取用户成就
```
GET https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/
    ?appid=1172380
    &steamid={STEAM_ID_64}
    &key={API_KEY}
```

**返回示例**
```json
{
  "playerstats": {
    "steamID": "76561198XXXXXXXXX",
    "gameName": "STAR WARS Jedi: Fallen Order™",
    "achievements": [
      { "apiname": "ACH_STORY_MANTIS", "achieved": 1, "unlocktime": 1714300000 },
      { "apiname": "ACH_STORY_BOGANO", "achieved": 0, "unlocktime": 0 }
    ]
  }
}
```

### 获取游戏全局成就解锁率（用于热度对比）
```
GET https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/
    ?gameid=1172380
```

---

## 接入前提

| 条件 | 说明 |
|---|---|
| Steam API Key | 在 https://steamcommunity.com/dev/apikey 免费申请 |
| 用户 Steam ID | 64位数字 ID，用户可在 Steam 设置中查看 |
| 用户档案公开 | 档案需设置为"公开"，否则返回 403 |

---

## MVP 实现方案

**方式 A（推荐）**: 用户自行输入 Steam ID + 应用内配置 API Key  
**方式 B**: 用户在应用内粘贴 Steam 个人资料页 URL，应用解析 SteamID

```python
# Python 示例
import requests

def get_achievements(steam_id, api_key, app_id=1172380):
    url = "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/"
    params = {"key": api_key, "steamid": steam_id, "appid": app_id}
    resp = requests.get(url, params=params)
    return resp.json()["playerstats"]["achievements"]
```

---

## 速率限制
- 公开 API：100,000 次/天，个人使用完全够用
- 建议本地缓存成就数据，避免频繁请求

---

## Jedi FO Steam App ID
```
1172380
```
