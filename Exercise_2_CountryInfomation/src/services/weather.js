/**
 * ============================================================================
 *  weather.js —— 天气数据服务层（services 层）
 * ============================================================================
 *
 * 【这个文件是干什么的】
 * 负责"跟第三方天气 API 说话"。组件（Weather.jsx）不直接发请求，
 * 而是调用这里暴露的函数拿到"已经整理好的数据"。
 *
 * 【为什么要单独抽一层 services】
 * 1. 组件只管显示，网络细节集中在一处，改接口只改这里
 * 2. 便于复用（别的组件也能调用）和单元测试
 * 3. 项目里还有一个同层的 country.js（国家数据），结构一致
 *
 * 【数据来源】
 * Open-Meteo（https://open-meteo.com/）
 *  - 免费、无需 API Key、无需注册
 *  - 文档：https://open-meteo.com/en/docs
 *  - 协议：JSON over HTTPS
 *
 * 【依赖】axios：项目已安装的 HTTP 客户端（package.json 里 axios ^1.20.0）
 *  axios 的作用：发 GET 请求 + 自动把响应 JSON 解析成对象 + 出错时抛异常
 */
import axios from "axios";

/**
 * ----------------------------------------------------------------------------
 * 1. 接口地址（baseUrl）
 * ----------------------------------------------------------------------------
 * 来源：Open-Meteo 文档中的 "Forecast API" 端点
 * 完整请求形如：
 *   https://api.open-meteo.com/v1/forecast?latitude=39.92&longitude=116.38&current=temperature_2m
 *
 * 注意：这里只写"基础地址"，查询参数（? 后面的部分）由下面的 params 交给 axios 拼，
 * 避免手写字符串拼接时出现 & / ? 错位或中文未转义的问题。
 */
const baseUrl = "https://api.open-meteo.com/v1/forecast";

/**
 * ----------------------------------------------------------------------------
 * 2. 请求哪些"当前天气"字段
 * ----------------------------------------------------------------------------
 * Open-Meteo 的 current 参数用来指定要返回的实时变量，多个用逗号分隔。
 * 字段名含义（均为 Open-Meteo 官方命名）：
 *   temperature_2m        —— 距离地面 2 米处的气温
 *   wind_speed_10m        —— 距离地面 10 米处的风速
 *   relative_humidity_2m  —— 2 米处的相对湿度
 *   weather_code          —— WMO 天气现象代码（一个数字，代表晴/雨/雪…）
 *
 * 想在页面上多显示内容（如 is_day 判断是否白天、apparent_temperature 体感温度），
 * 只要往这个数组里加字段名即可，无需改动其他代码。
 */
const currentFields = [
  "temperature_2m", // 温度
  "wind_speed_10m", // 风速
  "relative_humidity_2m", // 相对湿度
  "weather_code", // WMO 天气代码
];

/**
 * ----------------------------------------------------------------------------
 * 3. WMO 天气代码 → 中文描述 对照表
 * ----------------------------------------------------------------------------
 * 【来源】Open-Meteo 文档 "Weather code" 章节，其依据是 WMO 4677 标准代码表。
 * 【为什么需要】接口只返回一个数字（如 61），用户看不懂，需要翻译成"小雨"。
 * 【形式】对象字面量，键是数字 code，值是中文描述。
 */
const weatherDescriptions = {
  0: "晴朗",
  1: "大部晴朗",
  2: "局部多云",
  3: "阴天",
  45: "雾",
  48: "雾凇",
  51: "小毛毛雨",
  53: "中毛毛雨",
  55: "大毛毛雨",
  56: "冻毛毛雨（弱）",
  57: "冻毛毛雨（强）",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨（弱）",
  67: "冻雨（强）",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "小阵雨",
  81: "中阵雨",
  82: "强阵雨",
  85: "小阵雪",
  86: "大阵雪",
  95: "雷暴",
  96: "雷暴伴小冰雹",
  99: "雷暴伴大冰雹",
};

/**
 * ----------------------------------------------------------------------------
 * 4. getCurrent(latitude, longitude) —— 按经纬度查当前天气
 * ----------------------------------------------------------------------------
 *
 * 【输入】
 *   latitude  : number，纬度（-90 ~ 90），如 39.92
 *   longitude : number，经度（-180 ~ 180），如 116.38
 *
 * 【做了什么】—— 这里的拼接是「axios 内置功能」，不是我们自己写的代码
 *   axios.get(url, { params })：第二个参数是请求配置对象，其中的 params 字段
 *   会被 axios 内部的 buildURL（axios/lib/helpers/buildURL.js）自动序列化成查询串：
 *
 *     { latitude: 39.92, longitude: 116.38, current: "temperature_2m,..." }
 *     ↓ axios 内部处理
 *     ?latitude=39.92&longitude=116.38&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code
 *
 *   注意逗号「,」没有被转义成 %2C：因为 axios 的 encode() 会特意把 %2C 还原成 ,
 *   （见 buildURL.js 第 15-19 行，还原的还有 : $ 和空格→+）
 *   最终请求地址：
 *   https://api.open-meteo.com/v1/forecast?latitude=39.92&longitude=116.38&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code
 *
 * 【接口原始输出】（真实示例，已实测）
 * {
 *   "latitude": 39.920002,
 *   "longitude": 116.379997,
 *   "timezone": "Asia/Shanghai",
 *   "current_units": {
 *     "time": "iso8601",
 *     "temperature_2m": "°C",
 *     "wind_speed_10m": "km/h",
 *     "relative_humidity_2m": "%",
 *     "weather_code": "wmo code"
 *   },
 *   "current": {
 *     "time": "2026-09-24T17:00",
 *     "interval": 900,
 *     "temperature_2m": 21.5,
 *     "wind_speed_10m": 8.3,
 *     "relative_humidity_2m": 55,
 *     "weather_code": 0
 *   }
 * }
 *
 * 【本函数输出】（把深层结构"摊平"，组件用起来更简单）
 * {
 *   temperature: 21.5,        // 温度（原 current.temperature_2m）
 *   windSpeed:   8.3,         // 风速（原 current.wind_speed_10m）
 *   humidity:    55,          // 湿度（原 current.relative_humidity_2m）
 *   weatherCode: 0,           // WMO 代码（原 current.weather_code）
 *   units: {                  // 单位表（原 current_units），页面上用来显示 °C / km/h / %
 *     temperature_2m: "°C",
 *     wind_speed_10m: "km/h",
 *     relative_humidity_2m: "%"
 *   }
 * }
 *
 * 【返回值类型】Promise —— 调用方要用 .then() 或 await 取结果
 *
 * 【可能出错的情况】
 *   - 网络不通 / 接口 5xx → axios 抛异常，Promise 进入 rejected
 *   - 经纬度非法 → 接口返回 400 错误对象
 *   这些错误交给调用方（Weather.jsx 的 .catch）处理
 */
const getCurrent = (latitude, longitude) => {
  // 用 params 让 axios 自动拼查询串，避免手写 ?& 出错
  const request = axios.get(baseUrl, {
    params: {
      latitude,
      longitude,
      current: currentFields.join(","), // 数组 → "temperature_2m,wind_speed_10m,..."
    },
  });

  return request.then((response) => {
    // axios 把响应放在 response.data；这里用解构 + 重命名取出两块数据
    // current_units → 重命名为 units（下划线命名转更短的变量名）
    const { current, current_units: units } = response.data;

    // 返回一个"扁平化"的新对象，而不是把原始 response 直接丢给组件
    return {
      temperature: current.temperature_2m, // 温度
      windSpeed: current.wind_speed_10m, // 风速
      humidity: current.relative_humidity_2m, // 相对湿度
      weatherCode: current.weather_code, // WMO 天气代码
      units, // 各字段单位，如 { temperature_2m: "°C", wind_speed_10m: "km/h" }
    };
  });
};

/**
 * ----------------------------------------------------------------------------
 * 5. getCurrentByCountry(country) —— 传入国家对象直接查天气
 * ----------------------------------------------------------------------------
 *
 * 【输入】country：REST Countries 接口返回的国家对象（来自 country.js）
 *
 * 【坐标从哪里来】——重点！
 * 本项目的坐标**不需要额外的"地理编码"请求**，因为国家数据里自带经纬度：
 *
 *   country.capitalInfo.latlng  → 首都坐标，如 China 是 [39.92, 116.38]（北京）
 *   country.latlng              → 国家几何中心，如 China 是 [35, 105]（甘肃一带）
 *
 * 因为要显示"首都天气"，所以优先用 capitalInfo.latlng。
 *
 * 【降级策略】??（空值合并运算符）
 *   A ?? B 的含义：只有 A 是 null / undefined 时才用 B
 *   所以：有首都坐标用首都坐标；没有才退回国家中心；都没有 → 空数组 []
 *
 * 【输出】
 *   有坐标 → Promise<扁平天气对象>（同 getCurrent）
 *   无坐标 → Promise<null>（用 Promise.resolve(null) 保持返回类型一致，调用方无需判断同步/异步）
 */
const getCurrentByCountry = (country) => {
  // 数组解构：把 [纬度, 经度] 拆成两个变量
  const [latitude, longitude] =
    country.capitalInfo?.latlng ?? country.latlng ?? [];
  //              ↑ 可选链：capitalInfo 不存在时返回 undefined 而不报错

  // 数组为空 → 解构出的两个值都是 undefined，说明该国没有坐标数据
  if (latitude === undefined || longitude === undefined) {
    return Promise.resolve(null);
  }
  return getCurrent(latitude, longitude);
};

/**
 * ----------------------------------------------------------------------------
 * 6. describeWeather(code) —— WMO 代码转中文
 * ----------------------------------------------------------------------------
 * 【输入】code: number，如 61
 * 【输出】string，如 "小雨"；查不到时返回 "未知天气"
 * 【写法】?? 兜底：weatherDescriptions[code] 为 undefined 时用默认值
 */
const describeWeather = (code) => weatherDescriptions[code] ?? "未知天气";

/**
 * ----------------------------------------------------------------------------
 * 7. 对外导出
 * ----------------------------------------------------------------------------
 * 默认导出一个对象（项目里 country.js 也是同样的风格：export default { getAll, getOne }）
 * 使用方写法：import weatherService from "../services/weather.js";
 *            weatherService.getCurrentByCountry(country)
 */
export default {
  getCurrent, // 按经纬度查
  getCurrentByCountry, // 按国家对象查（组件实际用的）
  describeWeather, // 代码转文字
  weatherDescriptions, // 对照表（需要时可直接查看/扩展）
};
